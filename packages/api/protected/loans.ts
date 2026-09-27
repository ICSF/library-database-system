import { prisma, Prisma } from '@library/db';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router } from '../context.js';

const LOAN_LENGTH_DAYS = 28;

const itemLoanStatusInput = z.object({
  item_id: z.number().int().positive(),
});

const loanCreateInput = z.object({
  item_id: z.number().int().positive(),
  member_id: z.uuid(),
  notes: z.string().trim().nullable(),
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
            reminder_count: 0,
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
});
