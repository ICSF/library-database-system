// serverless setup for vercel
import {createHTTPHandler} from '@trpc/server/adapters/standalone';

import {appRouter} from './index';

export default createHTTPHandler({
  router: appRouter,
  basePath: '/api/trpc/',
});