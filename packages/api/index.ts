import {prisma} from '@library/db';
import { createClient } from '@supabase/supabase-js';
import {initTRPC, TRPCError} from '@trpc/server';
import type { CreateHTTPContextOptions } from '@trpc/server/adapters/standalone';
import { env } from '@library/config';

//TODO: move elsewjere
const HARD_MAX_ROWS = 20000;

// only 2 access roles
export type CommitteeAccessRole = 'committee' | 'librarian';

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
    const committeeRow = await prisma.committee.findUnique({
      where: { user_id: ctx.user.id },
      select: { access_role: true, role: true },
    });

    if (!committeeRow) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'No committee record found for this account.',
      });
    }

    return {
      id: ctx.user.id,
      email: ctx.user.email,
      accessRole: committeeRow.access_role as CommitteeAccessRole,
      role: committeeRow.role,
    };
  }),

});

export type AppRouter = typeof appRouter;