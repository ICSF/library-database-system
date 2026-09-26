import { prisma } from '@library/db';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { publicProcedure, router } from '../context.js';

const MAX_PAGE_SIZE = 100;

const itemListInput = z.object({
  search: z.string().trim().default(''),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(50),
});

export const itemsRouter = router({
  // Returns a single page of items, optionally filtered by a search term
  // across title / author / series / ISBN. 
  itemList: publicProcedure.input(itemListInput).query(async ({ input }) => {
    const { search, page, pageSize } = input;

    const where = search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { author_name: { contains: search, mode: 'insensitive' as const } },
            { series_name: { contains: search, mode: 'insensitive' as const } },
            { isbn: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    try {
      const [rows, total] = await Promise.all([
        prisma.catalogue.findMany({
          where,
          select: {
            item_id: true,
            title: true,
            author_name: true,
            series_name: true,
            series_num: true,
            item_type: true,
            location: true,
            isbn: true,
            is_borrowable: true,
            is_damaged: true,
            is_awol: true,
            is_retired: true,
          },
          orderBy: [
            { author_name: 'asc' },
            { series_name: 'asc' },
            { series_num: 'asc' },
            { title: 'asc' },
          ],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.catalogue.count({ where }),
      ]);

      const items = rows
        .filter((item): item is typeof item & { item_id: number } => item.item_id !== null)
        .map((item) => ({
          item_id: item.item_id,
          title: item.title ?? '',
          author_name: item.author_name ?? '',
          series_name: item.series_name,
          series_num: item.series_num,
          item_type: item.item_type ?? 'Unknown',
          location: item.location ?? 'Unknown',
          isbn: item.isbn,
          is_borrowable: item.is_borrowable ?? false,
          is_damaged: item.is_damaged ?? false,
          is_awol: item.is_awol ?? false,
          is_retired: item.is_retired ?? false,
        }));

      return { items, total };
    } catch (err) {
      console.error('[itemsList] query failed:', err);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unable to load catalogue',
        cause: err,
      });
    }
  }),
});