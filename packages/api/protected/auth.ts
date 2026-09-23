import { prisma } from '@library/db';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../context.js';

export const authRouter = router({
  // who's signed in + committee role + access role
  me: protectedProcedure.query(async ({ ctx }) => {
    let committeeRow;
    try {
      committeeRow = await prisma.committee.findUnique({
        where: { user_id: ctx.user.id },
        select: { role: true, isHeadLibrarian: true },
      });
    } catch (err) {
      console.error('[me] db query failed:', err);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to load user profile.',
        cause: err,
      });
    }

    if (!committeeRow) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'No committee record found for this account.',
      });
    }

    return {
      id: ctx.user.id,
      email: ctx.user.email,
      isHead: committeeRow.isHeadLibrarian,
      role: committeeRow.role,
    };
  }),
});
