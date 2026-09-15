import {prisma} from '@library/db';
import {initTRPC, TRPCError} from '@trpc/server';
import {z} from 'zod';

const t = initTRPC.create();

export const appRouter = t.router({
  health: t.procedure.query(async () => {
    const start = Date.now();

    try {
      const result = await prisma.$queryRaw<{ok: number; server_time: Date}[]>`
        SELECT 1 as ok, now() as server_time;
      `;

      const latencyMs = Date.now() - start;

      return {
        status: 'ok' as const,
        db: 'connected' as const,
        latencyMs,
        serverTime: result[0]?.server_time ?? null,
      };
    } catch (err) {
      const latencyMs = Date.now() - start;

      console.error('[health check] DB connection failed:', err);

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Database health check failed after ${latencyMs}ms`,
        cause: err,
      });
    }
  }),
});

export type AppRouter = typeof appRouter;