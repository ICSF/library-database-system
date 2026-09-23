import {prisma, Prisma, type PrismaClient} from '@library/db';
import { createClient } from '@supabase/supabase-js';
import {initTRPC, TRPCError} from '@trpc/server';
import type { CreateHTTPContextOptions } from '@trpc/server/adapters/standalone';
import { env } from '@library/config';
import { z } from 'zod';

// Server-side only Supabase client, used purely to verify tokens the
// frontend sends us. Uses the SERVICE ROLE key - never ship this to a browser.
const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY);

export async function createContext({ req }: CreateHTTPContextOptions) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : undefined;

  if (!token) {
    return { user: null };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return { user: null };
  }

  return { user: data.user };
}

type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

const requireAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in as a committee member.',
    });
  }
  // narrows ctx.user from `User | null` to `User` for anything downstream.
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// two procedures depending on whether the api route needs auth or not
const publicProcedure = t.procedure;
const protectedProcedure = t.procedure.use(requireAuth);

// Keep the configured academic year in one place so add, edit, renew, and
// member lookup operations all use the same membership-settings row.
async function getCurrentMembershipYear(client: Pick<PrismaClient, 'membership_settings'>): Promise<number> {
  const settings = await client.membership_settings.findUnique({
    where: { singleton: true },
    select: { current_membership_year: true },
  });

  if (!settings) {
    throw new Error('Current membership year is not configured.');
  }

  return settings.current_membership_year;
}

export const appRouter = t.router({
  // Catalogue List endpoint: returns a list of catalogue items, from the catalogue_search view
  catalogueList: publicProcedure.query(async () => {
    try {
      const rows = await prisma.catalogue_search.findMany({
        select: {
          title: true,
          series: true,
          series_num: true,
          author_name: true,
          isbn: true,
        },
        orderBy: [
          { author_name: 'asc' },
          { series: 'asc' },
          { series_num: 'asc' },
          { title: 'asc' },
        ],
      });
      return rows;
    } catch (err) {
      console.error('[catalogueList] query failed:', err);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Unable to load catalogue`,
        cause: err,
      });
    }
  }),

  // who's signed in + committee role + access role
  me: protectedProcedure.query(async ({ ctx }) => {
    let committeeRow;
    try {
      committeeRow = await prisma.committee.findUnique({
        where: { user_id: ctx.user.id },
        select: { role: true, isHeadLibrarian: true },
      });
    } catch (err) {
      console.error('[me] db query failed:', err);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to load user profile.',
        cause: err,
      });
    }

    if (!committeeRow) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'No committee record found for this account.',
      });
    }

    return {
      id: ctx.user.id,
      email: ctx.user.email,
      isHead: committeeRow.isHeadLibrarian,
      role: committeeRow.role,
    };
  }),

  // returns info from departments table and member types table for members form
  memberFormOptions: protectedProcedure.query(async () => {
    try {
      const [memberTypes, departments] = await Promise.all([
        prisma.member_types.findMany({
          select: { member_type_id: true, member_type: true },
          orderBy: { member_type_id: 'asc' },
        }),
        prisma.departments.findMany({
          select: { department_id: true, name: true },
          orderBy: { name: 'asc' },
        }),
      ]);

      return {
        memberTypes: memberTypes.map(({ member_type_id, member_type }) => ({
          id: member_type_id,
          name: member_type,
        })),
        departments: departments.map(({ department_id, name }) => ({
          id: department_id,
          name,
        })),
      };
    } catch (err) {
      console.error('[memberFormOptions] db query failed:', err);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to load member form options.',
        cause: err,
      });
    }
  }),

  // list of all members - takes from current_members view if user wants current members, otherwise
  // takes from the whole members table
  memberList: protectedProcedure
    .input(z.object({ scope: z.enum(['current', 'all']) }))
    .query(async ({ input }) => {
      try {
        if (input.scope === 'current') {
          // The view already joins the configured membership year and removes
          // disabled members, so every returned record is current.
          const members = await prisma.current_members.findMany({
            select: {
              member_id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
            orderBy: [{ last_name: 'asc' }, { first_name: 'asc' }],
          });

          return members
            .filter((member): member is typeof member & { member_id: string } => member.member_id !== null)
            .map((member) => ({
              member_id: member.member_id,
              first_name: member.first_name!,
              last_name: member.last_name!,
              email: member.email,
              status: 'Current' as const,
            }));
        }

        const [members, currentMembers] = await Promise.all([
          prisma.members.findMany({
            select: {
              member_id: true,
              first_name: true,
              last_name: true,
              email: true,
              is_disabled: true,
            },
            orderBy: [{ last_name: 'asc' }, { first_name: 'asc' }],
          }),
          prisma.current_members.findMany({
            select: { member_id: true },
          }),
        ]);

        const currentMemberIds = new Set(
          currentMembers
            .map((member) => member.member_id)
            .filter((memberId): memberId is string => memberId !== null),
        );

        return members.map((member) => ({
          member_id: member.member_id,
          first_name: member.first_name,
          last_name: member.last_name,
          email: member.email,
          status: member.is_disabled
            ? 'Disabled' as const
            : currentMemberIds.has(member.member_id)
              ? 'Current' as const
              : 'Past' as const,
        }));
      } catch (err) {
        console.error('[memberList] db query failed:', err);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to load members.',
          cause: err,
        });
      }
    }),

  memberById: protectedProcedure
    .input(z.object({ member_id: z.uuid() }))
    .query(async ({ input }) => {
      try {
        const result = await prisma.$transaction(async (transaction) => {
          const currentMembershipYear = await getCurrentMembershipYear(transaction);

          const [member, membership] = await Promise.all([
            transaction.members.findUnique({
              where: { member_id: input.member_id },
              select: {
                member_id: true,
                first_name: true,
                last_name: true,
                member_type_id: true,
                dept_id: true,
                uni_year: true,
                email: true,
                comments: true,
                is_disabled: true,
                disabled_reason: true,
              },
            }),
            transaction.member_memberships.findFirst({
              where: {
                member_id: input.member_id,
                membership_year: currentMembershipYear,
              },
              select: { notes: true },
            }),
          ]);

          return member
            ? {
                ...member,
                year_comments: membership?.notes ?? null,
              }
            : null;
        });

        if (!result) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Member not found.',
          });
        }

        return result;
      } catch (err) {
        if (err instanceof TRPCError) {
          throw err;
        }
        console.error('[memberById] db query failed:', err);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to load member.',
          cause: err,
        });
      }
    }),

  // update operation to update member details
  updateMember: protectedProcedure
    .input(
      z.object({
        member_id: z.uuid(),
        first_name: z.string().trim().min(1),
        last_name: z.string().trim().min(1),
        member_type_id: z.number().int().positive().nullable(),
        dept_id: z.number().int().positive().nullable(),
        uni_year: z.string().trim().nullable(),
        email: z.email(),
        comments: z.string().trim().nullable(),
        year_comments: z.string().trim().nullable(),
        is_disabled: z.boolean(),
        disabled_reason: z.string().trim().nullable(),
      })
      .refine(
        (v) => !v.is_disabled || (v.disabled_reason && v.disabled_reason.length > 0),
        { message: 'A reason is required when disabling a member.', path: ['disabled_reason'] },
      ),
    )
    .mutation(async ({ input }) => {
      try {
        return await prisma.$transaction(async (transaction) => {
          const currentMembershipYear = await getCurrentMembershipYear(transaction);

          // Check existence explicitly first, so a missing member produces a clean NOT_FOUND 
          const existingMember = await transaction.members.findUnique({
            where: { member_id: input.member_id },
            select: { member_id: true },
          });

          if (!existingMember) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Member not found.',
            });
          }

          const updatedMember = await transaction.members.update({
            where: { member_id: input.member_id },
            data: {
              first_name: input.first_name,
              last_name: input.last_name,
              member_type_id: input.member_type_id,
              dept_id: input.dept_id,
              uni_year: input.uni_year,
              email: input.email,
              comments: input.comments,
              is_disabled: input.is_disabled,
              disabled_reason: input.disabled_reason,
            },
            select: { member_id: true, first_name: true, last_name: true },
          });

          // `count` tells us whether a membership row for the current year
          // actually existed to attach `year_comments` to 
          const { count } = await transaction.member_memberships.updateMany({
            where: {
              member_id: input.member_id,
              membership_year: currentMembershipYear,
            },
            data: { notes: input.year_comments },
          });

          return {
            member_id: updatedMember.member_id,
            name: `${updatedMember.first_name} ${updatedMember.last_name}`,
            yearCommentsSaved: count > 0,
          };
          });
      } catch (err) {
        console.error('[updateMember] db mutation failed:', err);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update member.',
          cause: err,
        });
      }
    }),

  // renew a member: updates member info 
  // adds a row to member_memberships with the uuid and the current membership year
  renewMember: protectedProcedure
    .input(
      z.object({
        member_id: z.uuid(),
        first_name: z.string().trim().min(1),
        last_name: z.string().trim().min(1),
        member_type_id: z.number().int().positive().nullable(),
        dept_id: z.number().int().positive().nullable(),
        uni_year: z.string().trim().nullable(),
        email: z.string().trim().email(),
        comments: z.string().trim().nullable(),
        year_comments: z.string().trim().nullable(),
        is_disabled: z.boolean(),
        disabled_reason: z.string().trim().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const { name, currentMembershipYear } = await prisma.$transaction(async (transaction) => {
          const currentMembershipYear = await getCurrentMembershipYear(transaction);

          // check member existence explicitly first
          const existingMember = await transaction.members.findUnique({
            where: { member_id: input.member_id },
            select: { member_id: true },
          });

          if (!existingMember) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Member not found.',
            });
          }

          const member = await transaction.members.update({
            where: { member_id: input.member_id },
            data: {
              first_name: input.first_name,
              last_name: input.last_name,
              member_type_id: input.member_type_id,
              dept_id: input.dept_id,
              uni_year: input.uni_year,
              email: input.email,
              comments: input.comments,
              is_disabled: input.is_disabled,
              disabled_reason: input.disabled_reason,
            },
            select: { first_name: true, last_name: true },
          });

          return {
            name: `${member.first_name} ${member.last_name}`,
            currentMembershipYear,
          };
        });

        // create membership row
        try {
          await prisma.member_memberships.create({
            data: {
              member_id: input.member_id,
              membership_year: currentMembershipYear,
              notes: input.year_comments,
            },
          });
          return { status: 'success' as const, name };
        } catch (createErr) {
          const rowAlreadyExists =
            createErr instanceof Prisma.PrismaClientKnownRequestError && createErr.code === 'P2002';

          if (!rowAlreadyExists) {
            throw createErr;
          }
        
          // update the notes for the row if that's why it failed
          await prisma.member_memberships.updateMany({
            where: {
              member_id: input.member_id,
              membership_year: currentMembershipYear,
            },
            data: { notes: input.year_comments },
          });
          return { status: 'already_current' as const, name };
        }
      } catch (err) {
        if (err instanceof TRPCError) {
          throw err;
        }
        console.error('[renewMember] db mutation failed:', err);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to renew member.',
          cause: err,
        });
      }
    }),

  // insert operation to add new member
  addMember: protectedProcedure
    .input(
      z.object({
        first_name: z.string().trim().min(1),
        last_name: z.string().trim().min(1),
        member_type_id: z.number().int().positive().nullable(),
        dept_id: z.number().int().positive().nullable(),
        uni_year: z.string().trim().nullable(),
        email: z.email(),
        comments: z.string().trim().nullable(),
        year_comments: z.string().trim().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const member = await prisma.$transaction(async (transaction) => {
          const currentMembershipYear = await getCurrentMembershipYear(transaction);

          const createdMember = await transaction.members.create({
            data: {
              first_name: input.first_name,
              last_name: input.last_name,
              member_type_id: input.member_type_id,
              dept_id: input.dept_id,
              uni_year: input.uni_year,
              email: input.email,
              comments: input.comments,
              join_date: new Date(),
            },
          });

          await transaction.member_memberships.create({
            data: {
              member_id: createdMember.member_id,
              membership_year: currentMembershipYear,
              notes: input.year_comments,
            },
          });

          return createdMember;
        });

        return { member_id: member.member_id };
      } catch (err) {
        console.error('[addMember] db mutation failed:', err);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add member.',
          cause: err,
        });
      }
    }),

});

export type AppRouter = typeof appRouter;