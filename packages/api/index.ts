import {prisma} from '@library/db';
import {initTRPC, TRPCError} from '@trpc/server';

const t = initTRPC.create();

//TODO: move elsewjere
const HARD_MAX_ROWS = 20000;

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

  // Catalogue List endpoint: returns a list of catalogue items, from the catalogue_search view
  catalogueList: t.procedure.query(async () => {
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


});

export type AppRouter = typeof appRouter;