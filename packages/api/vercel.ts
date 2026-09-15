// serverless setup for vercel
import {createHTTPHandler} from '@trpc/server/adapters/standalone';

import {appRouter} from './index.js';

export default createHTTPHandler({
  router: appRouter,
  basePath: '/api/trpc/',
});