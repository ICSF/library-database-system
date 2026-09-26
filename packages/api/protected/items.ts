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
  isbn: z.string().trim().nullable(),
  is_damaged: z.boolean(),
  is_awol: z.boolean(),
  is_retired: z.boolean(),
  donated_by: z.string().trim().nullable(),
  comments: z.string().nullable(),
  reviews: z.string().nullable(),
});

const itemCreateInput = z.object({
  title: z.string().trim().min(1, 'Title is required.'),
  author_id: z.number().int().positive().nullable(),
  author_name: z.string().trim().min(1, 'Author is required.'),
  series_name: z.string().trim().nullable(),
  series_num: z.string().trim().nullable(),
  type_id: z.number().int().positive(),
  location_id: z.number().int().positive(),
  isbn: z.string().trim().nullable(),
  donated_by: z.string().trim().nullable(),
  comments: z.string().nullable(),
  reviews: z.string().nullable(),
});

// Shared by itemUpdate and itemCreate: given a client-supplied author_id
// (may be null) and author_name, returns a definite author_id to write to
// items.author_id - either the id the user picked from the autocomplete,
// or a case-insensitive exact-name match against an existing author, or
// a brand-new authors row. Must be run inside the same transaction as the items 
// write, so a concurrent duplicate-name create can't slip in between 
// the lookup and the item write.
async function resolveAuthorId(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  authorId: number | null,
  authorName: string,
): Promise<number> {
  if (authorId !== null) {
    return authorId;
  }

  const trimmedName = authorName.trim();

  const existing = await tx.authors.findFirst({
    where: { name: { equals: trimmedName, mode: 'insensitive' } },
    select: { author_id: true },
  });

  if (existing) {
    return existing.author_id;
  }

  const created = await tx.authors.create({
    data: { name: trimmedName },
    select: { author_id: true },
  });

  return created.author_id;
}

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
    try {
      const updated = await prisma.$transaction(async (tx) => {
        const existing = await tx.items.findUnique({
          where: { item_id: input.item_id },
          select: { is_retired: true, retire_date: true },
        });

        if (!existing) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Item not found.' });
        }

        const authorId = await resolveAuthorId(tx, input.author_id, input.author_name);

        let retireDate: Date | null;
        if (input.is_retired && !existing.is_retired) {
          // false -> true: stamp today.
          retireDate = new Date();
        } else if (!input.is_retired) {
          // -> false: always clear.
          retireDate = null;
        } else {
          // true -> true: leave whatever was already there.
          retireDate = existing.retire_date;
        }

        const isBorrowable = !input.is_damaged && !input.is_awol && !input.is_retired;

        const row = await tx.items.update({
          where: { item_id: input.item_id },
          data: {
            title: input.title,
            author_id: authorId,
            series: input.series_name,
            series_num: input.series_num,
            type_id: input.type_id,
            location_id: input.location_id,
            isbn: input.isbn,
            is_damaged: input.is_damaged,
            is_awol: input.is_awol,
            is_retired: input.is_retired,
            is_borrowable: isBorrowable,
            retire_date: retireDate,
            donated_by: input.donated_by,
            comments: input.comments,
            reviews: input.reviews,
          },
          include: {
            authors: { select: { name: true } },
          },
        });

        return row;
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
        is_borrowable: updated.is_borrowable,
        is_damaged: updated.is_damaged,
        is_awol: updated.is_awol,
        is_retired: updated.is_retired,
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
      console.error('[items] itemUpdate mutation failed:', err);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unable to update item',
        cause: err,
      });
    }
  }),

  // Creates a brand-new item. Same author find-or-create logic as
  // itemUpdate, but there's no status/retire_date handling to do at all -
  // a new item always starts out Borrowable (is_damaged/is_awol/is_retired
  // all false, is_borrowable true, retire_date null), with today recorded
  // as its acquire_date.
  itemCreate: protectedProcedure.input(itemCreateInput).mutation(async ({ input }) => {
    try {
      const created = await prisma.$transaction(async (tx) => {
        const authorId = await resolveAuthorId(tx, input.author_id, input.author_name);

        const row = await tx.items.create({
          data: {
            title: input.title,
            author_id: authorId,
            series: input.series_name,
            series_num: input.series_num,
            type_id: input.type_id,
            location_id: input.location_id,
            isbn: input.isbn,
            is_damaged: false,
            is_awol: false,
            is_retired: false,
            is_borrowable: true,
            retire_date: null,
            acquire_date: new Date(),
            donated_by: input.donated_by,
            comments: input.comments,
            reviews: input.reviews,
          },
          include: {
            authors: { select: { name: true } },
          },
        });

        return row;
      });

      return {
        item_id: created.item_id,
        title: created.title,
        author_id: created.author_id,
        author_name: created.authors.name,
        series_name: created.series,
        series_num: created.series_num,
        type_id: created.type_id,
        location_id: created.location_id,
        isbn: created.isbn,
        is_borrowable: created.is_borrowable,
        is_damaged: created.is_damaged,
        is_awol: created.is_awol,
        is_retired: created.is_retired,
        retire_date: created.retire_date ? created.retire_date.toISOString() : null,
        acquire_date: created.acquire_date ? created.acquire_date.toISOString() : null,
        donated_by: created.donated_by,
        comments: created.comments,
        reviews: created.reviews,
      };
    } catch (err) {
      console.error('[items] itemCreate mutation failed:', err);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unable to create item',
        cause: err,
      });
    }
  }),

});