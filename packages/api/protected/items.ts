import { prisma } from '@library/db';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router } from '../context.js';

const MAX_PAGE_SIZE = 100;
const AUTHOR_SEARCH_LIMIT = 10;

const itemListInput = z.object({
  search: z.string().trim().default(''),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(50),
});

const itemGetInput = z.object({
  item_id: z.number().int().positive(),
});

const authorSearchInput = z.object({
  search: z.string().trim().min(1),
});

// author_id is nullable: if the user typed a name without picking a
// suggestion from the autocomplete list, the frontend sends author_id:
// null and author_name as free text, and this procedure does a
// find-or-create by exact (case-insensitive) name match.
const itemUpdateInput = z.object({
  item_id: z.number().int().positive(),
  title: z.string().trim().min(1, 'Title is required.'),
  author_id: z.number().int().positive().nullable(),
  author_name: z.string().trim().min(1, 'Author is required.'),
  series_name: z.string().trim().nullable(),
  series_num: z.string().trim().nullable(),
  type_id: z.number().int().positive(),
  location_id: z.number().int().positive(),
  isbn: z
    .string()
    .trim()
    .nullable(),
  is_damaged: z.boolean(),
  is_awol: z.boolean(),
  is_retired: z.boolean(),
  donated_by: z.string().trim().nullable(),
  comments: z.string().nullable(),
  reviews: z.string().nullable(),
});

export const itemsRouter = router({
  // Returns a single page of items, optionally filtered by a search term
  // across title / author / series / ISBN. 
  itemList: protectedProcedure.input(itemListInput).query(async ({ input }) => {
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

  // Returns the full record for a single item, for the read-only item
  // Returns null if no item with that id exists 
  itemGet: protectedProcedure.input(itemGetInput).query(async ({ input }) => {
    const { item_id } = input;

    try {
      const row = await prisma.items.findUnique({
        where: { item_id },
        include: {
          authors: { select: { name: true } },
          media_types: { select: { media_type: true } },
          locations: { select: { name: true } },
        },
      });
      
      if (!row) return null;
      
      return {
        item_id: row.item_id,
        title: row.title,
        author_id: row.author_id,
        author_name: row.authors.name,
        series_name: row.series,
        series_num: row.series_num,
        type_id: row.type_id,
        item_type: row.media_types.media_type,
        location_id: row.location_id,
        location: row.locations.name,
        comments: row.comments,
        reviews: row.reviews,
        isbn: row.isbn,
        is_borrowable: row.is_borrowable,
        is_damaged: row.is_damaged,
        is_awol: row.is_awol,
        is_retired: row.is_retired,
        retire_date: row.retire_date ? row.retire_date.toISOString() : null,
        acquire_date: row.acquire_date ? row.acquire_date.toISOString() : null,
        donated_by: row.donated_by,
      };
          } catch (err) {
            console.error('[catalogue] itemGet query failed:', err);
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Unable to load item',
              cause: err,
            });
          }
        }),
      

  // Dropdown data sources for the add/edit item form.
  mediaTypeList: protectedProcedure.query(async () => {
    const rows = await prisma.media_types.findMany({
      select: { media_type_id: true, media_type: true },
      orderBy: { media_type: 'asc' },
    });
    return rows.map((row) => ({ id: row.media_type_id, name: row.media_type }));
  }),

  locationList: protectedProcedure.query(async () => {
    const rows = await prisma.locations.findMany({
      select: { location_id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return rows.map((row) => ({ id: row.location_id, name: row.name }));
  }),  

  // Autocomplete-as-you-type author search. 
  // Deliberately small limit - not a full paginated search.
  authorSearch: protectedProcedure.input(authorSearchInput).query(async ({ input }) => {
    const rows = await prisma.authors.findMany({
      where: { name: { contains: input.search, mode: 'insensitive' } },
      select: { author_id: true, name: true },
      orderBy: { name: 'asc' },
      take: AUTHOR_SEARCH_LIMIT,
    });
    return rows;
  }),

  // Updates an item:
  // Creates or finds an author if the author_id wasn't supplied
  // Updates retire date if the retired flag is set
  itemUpdate: protectedProcedure.input(itemUpdateInput).mutation(async ({ input }) => {
    const { item_id, author_id, author_name, is_damaged, is_awol, is_retired, ...rest } = input;

    try {
      const updated = await prisma.$transaction(async (tx) => {
        const current = await tx.items.findUnique({
          where: { item_id },
          select: { is_retired: true },
        });

        if (!current) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Item not found.' });
        }

        // --- Resolve author -------------------------------------------------
        let resolvedAuthorId = author_id;

        if (resolvedAuthorId === null) {
          const existingAuthor = await tx.authors.findFirst({
            where: { name: { equals: author_name, mode: 'insensitive' } },
            select: { author_id: true },
          });

          resolvedAuthorId = existingAuthor
            ? existingAuthor.author_id
            : (await tx.authors.create({ data: { name: author_name } })).author_id;
        }

        // --- Resolve retire_date ---------------------------------------------
        let retireDateUpdate: Date | null | undefined;
        if (!current.is_retired && is_retired) {
          retireDateUpdate = new Date(); // false -> true: stamp today
        } else if (!is_retired) {
          retireDateUpdate = null; // -> false: always clear
        } else {
          retireDateUpdate = undefined; // true -> true: leave untouched
        }

        // --- Resolve is_borrowable --------------------------------------------
        const isBorrowable = !is_damaged && !is_awol && !is_retired;

        return tx.items.update({
          where: { item_id },
          data: {
            title: rest.title,
            author_id: resolvedAuthorId,
            series: rest.series_name,
            series_num: rest.series_num,
            type_id: rest.type_id,
            location_id: rest.location_id,
            isbn: rest.isbn,
            is_damaged,
            is_awol,
            is_retired,
            is_borrowable: isBorrowable,
            donated_by: rest.donated_by,
            comments: rest.comments,
            reviews: rest.reviews,
            ...(retireDateUpdate !== undefined ? { retire_date: retireDateUpdate } : {}),
          },
          include: { authors: true },
        });
      });

      return {
        item_id: updated.item_id,
        title: updated.title,
        author_id: updated.author_id,
        author_name: updated.authors.name,
        series_name: updated.series,
        series_num: updated.series_num,
        type_id: updated.type_id,
        location_id: updated.location_id,
        isbn: updated.isbn,
        is_damaged: updated.is_damaged,
        is_awol: updated.is_awol,
        is_retired: updated.is_retired,
        is_borrowable: updated.is_borrowable,
        retire_date: updated.retire_date ? updated.retire_date.toISOString() : null,
        acquire_date: updated.acquire_date ? updated.acquire_date.toISOString() : null,
        donated_by: updated.donated_by,
        comments: updated.comments,
        reviews: updated.reviews,
      };
    } catch (err) {
      if (err instanceof TRPCError) {
        throw err;
      }
      console.error('[itemUpdate] mutation failed:', err);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unable to update item',
        cause: err,
      });
    }
  }),


});