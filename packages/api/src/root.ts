import {z} from 'zod';

import {publicProcedure, router} from './trpc.js';

export const appRouter = router({
  health: publicProcedure.input(z.object({}).optional())
              .query(() => ({ok: true, timestamp: new Date().toISOString()})),
});

export type AppRouter = typeof appRouter;