import { prisma, Prisma } from '@library/db';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router } from '../context.js';

const LOAN_LENGTH_DAYS = 28;
const MAX_PAGE_SIZE = 100;

const itemLoanStatusInput = z.object({
  item_id: z.number().int().positive(),
});

const loanCreateInput = z.object({
  item_id: z.number().int().positive(),
  member_id: z.uuid(),
  notes: z.string().trim().nullable(),
});

const loanReturnInput = z.object({
  loan_id: z.string().trim().min(1),
});

const loanListInput = z.object({
  search: z.string().trim().default(''),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(50),
});

// due date computed server side
function computeDueDate(): Date {
  const due = new Date();
  due.setDate(due.getDate() + LOAN_LENGTH_DAYS);
  return due;
}

export const loansRouter = router({
  // Returns whether an item currently has an open loan, and the loan details
  itemLoanStatus: protectedProcedure
    .input(itemLoanStatusInput)
    .query(async ({ input }) => {
      try {
        const openLoan = await prisma.loans.findFirst({
          where: { item_id: input.item_id, returned_at: null },
          select: {
            loan_id: true,
            issued_at: true,
            due_at: true,
            notes: true,
            times_renewed: true,
            member_id: true,
            members: { select: { first_name: true, last_name: true } },
            committee_loans_issued_byTocommittee: {
              select: { 
                role: true,
            },
            },
          },
        });

        if (!openLoan) {
          return { onLoan: false as const };
        }

        return {
          onLoan: true as const,
          loan_id: openLoan.loan_id.toString(),
          issued_at: openLoan.issued_at.toISOString(),
          due_at: openLoan.due_at.toISOString(),
          notes: openLoan.notes,
          times_renewed: openLoan.times_renewed,
          member_id: openLoan.member_id,
          member_name: `${openLoan.members.first_name} ${openLoan.members.last_name}`,
          issued_by: openLoan.committee_loans_issued_byTocommittee
            ? openLoan.committee_loans_issued_byTocommittee.role ?? 'Unknown'
            : 'Unknown',
        };
      } catch (err) {
        if (err instanceof TRPCError) {
          throw err;
        }

        console.error('[itemLoanStatus] db query failed:', err);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to load loan status.',
          cause: err,
        });
      }
    }),

  // Paginated, searchable list of every currently-open loan
  // Always scoped to open loans only 
  // Sort by due_at ascending
  loanList: protectedProcedure.input(loanListInput).query(async ({ input }) => {
    const { search, page, pageSize } = input;

    const where: Prisma.loansWhereInput = {
      returned_at: null,
      ...(search
        ? {
            OR: [
              { items: { title: { contains: search, mode: 'insensitive' as const } } },
              {
                items: {
                  authors: { name: { contains: search, mode: 'insensitive' as const } },
                },
              },
              { members: { first_name: { contains: search, mode: 'insensitive' as const } } },
              { members: { last_name: { contains: search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };

    try {
      const [rows, total] = await Promise.all([
        prisma.loans.findMany({
          where,
          select: {
            loan_id: true,
            item_id: true,
            issued_at: true,
            due_at: true,
            notes: true,
            times_renewed: true,
            items: {
              select: {
                title: true,
                authors: { select: { name: true } },
              },
            },
            members: { select: { first_name: true, last_name: true } },
            committee_loans_issued_byTocommittee: {
              select: { role: true},
            },
          },
          orderBy: { due_at: 'asc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.loans.count({ where }),
      ]);

      const loans = rows.map((row) => ({
        // loan_id (BigInt) and item_id are both converted for the wire -
        // item_id is a plain Int already, kept as-is for the Return link.
        loan_id: row.loan_id.toString(),
        item_id: row.item_id,
        title: row.items.title,
        author_name: row.items.authors.name,
        member_name: `${row.members.first_name} ${row.members.last_name}`,
        issued_by: row.committee_loans_issued_byTocommittee
            ? row.committee_loans_issued_byTocommittee.role ?? 'Unknown'
            : 'Unknown',
        issued_at: row.issued_at.toISOString(),
        due_at: row.due_at.toISOString(),
        notes: row.notes,
        times_renewed: row.times_renewed,
      }));

      return { loans, total };
    } catch (err) {
      console.error('[loanList] db query failed:', err);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unable to load loans.',
        cause: err,
      });
    }
  }),

  // Issues a new loan. issued_at/due_at are always computed server-side,
  // issued_by comes from the authenticated committee user 
  // Member_id must belong to a CURRENT member - this is enforced here as
  // an explicit pre-check 
  loanCreate: protectedProcedure
    .input(loanCreateInput)
    .mutation(async ({ input, ctx }) => {
      try {
        // Confirms the item exists at all, giving a clean NOT_FOUND
        // instead of a raw foreign-key violation from Postgres.
        const item = await prisma.items.findUnique({
          where: { item_id: input.item_id },
          select: { item_id: true },
        });

        if (!item) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Item not found.',
          });
        }

        // Only current (paid-up, non-disabled) members can borrow 
        const currentMember = await prisma.current_members.findFirst({
          where: { member_id: input.member_id },
          select: { member_id: true },
        });

        if (!currentMember) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Selected member is not a current member.',
          });
        }

        const loan = await prisma.loans.create({
          data: {
            item_id: input.item_id,
            member_id: input.member_id,
            issued_at: new Date(),
            due_at: computeDueDate(),
            returned_at: null,
            issued_by: ctx.user.id,
            returned_by: null,
            notes: input.notes,
            times_renewed: 0,
          },
          select: { loan_id: true },
        });

        return { loan_id: loan.loan_id.toString() };
      } catch (err) {
        if (err instanceof TRPCError) {
          throw err;
        }

        // Partial unique index (loans_one_open_loan_per_item_idx) violation
        // - someone else issued a loan for this same item in the tiny
        // window between the frontend's status check and this mutation.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'This item is already on loan.',
            cause: err,
          });
        }

        console.error('[loanCreate] db mutation failed:', err);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to issue loan.',
          cause: err,
        });
      }
    }),

  // marks a loan as returned (sets returned_at and returned_by)
  loanReturn: protectedProcedure
    .input(loanReturnInput)
    .mutation(async ({ input, ctx }) => {
      let loanId: bigint;

      try {
        loanId = BigInt(input.loan_id);
      } catch {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid loan id.',
        });
      }

      try {
        const { count } = await prisma.loans.updateMany({
          where: { loan_id: loanId, returned_at: null },
          data: {
            returned_at: new Date(),
            returned_by: ctx.user.id,
          },
        });

        // db conflict
        if (count === 0) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'This loan has already been returned.',
          });
        }

        return { success: true as const };
      } catch (err) {
        if (err instanceof TRPCError) {
          throw err;
        }

        console.error('[loanReturn] db mutation failed:', err);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to return item.',
          cause: err,
        });
      }
    }),
});
