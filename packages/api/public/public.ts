import { prisma } from '@library/db';
import { TRPCError } from '@trpc/server';
import { publicProcedure, router } from '../context.js';

export const publicRouter = router({
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
});
