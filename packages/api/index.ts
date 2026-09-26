import { mergeRouters } from './context.js';
import { publicRouter } from './public/public.js';
import { authRouter } from './protected/auth.js';
import { membersRouter } from './protected/members.js';
import { itemsRouter } from './protected/items.js';

export { createContext } from './context.js';
export type { Context } from './context.js';

// mergeRouters keeps every procedure at the top level
export const appRouter = mergeRouters(publicRouter, authRouter, membersRouter, itemsRouter);

export type AppRouter = typeof appRouter;