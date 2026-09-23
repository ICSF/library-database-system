import { createClient } from '@supabase/supabase-js';
import { initTRPC, TRPCError } from '@trpc/server';
import type { CreateHTTPContextOptions } from '@trpc/server/adapters/standalone';
import { env } from '@library/config';

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

export type Context = Awaited<ReturnType<typeof createContext>>;

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

// re-exported so every procedure/router file builds off the same tRPC
// instance instead of each calling initTRPC again.
export const router = t.router;
export const mergeRouters = t.mergeRouters;
export const middleware = t.middleware;

// two procedures depending on whether the api route needs auth or not
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(requireAuth);
