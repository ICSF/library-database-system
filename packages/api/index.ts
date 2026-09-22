import {prisma} from '@library/db';
import { createClient } from '@supabase/supabase-js';
import {initTRPC, TRPCError} from '@trpc/server';
import type { CreateHTTPContextOptions } from '@trpc/server/adapters/standalone';
import { env } from '@library/config';
import { z } from 'zod';

//TODO: move elsewjere
const HARD_MAX_ROWS = 20000;

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
        take: HARD_MAX_ROWS,
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

  // insert operation to add new member
  addMember: protectedProcedure
    .input(
      z.object({
        first_name: z.string().trim().min(1),
        last_name: z.string().trim().min(1),
        member_type_id: z.number().int().positive().nullable(),
        dept_id: z.number().int().positive().nullable(),
        uni_year: z.string().trim().nullable(),
        email: z.email().trim(),
        comments: z.string().trim().nullable(),
        year_comments: z.string().trim().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const member = await prisma.$transaction(async (transaction) => {
          const membershipSettings = await transaction.membership_settings.findUnique({
            where: { singleton: true },
            select: { current_membership_year: true },
          });

          if (!membershipSettings) {
            throw new Error('Current membership year is not configured.');
          }

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
              membership_year: membershipSettings.current_membership_year,
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