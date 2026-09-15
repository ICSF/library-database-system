import {prisma} from '@library/db';
import {initTRPC, TRPCError} from '@trpc/server';

const t = initTRPC.create();

export const appRouter = t.router({
  // health check
  health: t.procedure.query(async () => {
    const start = Date.now();

    try {
      await prisma.$connect();

      return {
        status: 'ok' as const,
        db: 'connected' as const,
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      console.error('[health check] DB connection failed:', err);

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Database health check failed`,
        cause: err,
      });
    }
  }),
});

export type AppRouter = typeof appRouter;