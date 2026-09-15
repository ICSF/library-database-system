import {appRouter} from '@library/api';
import {createHTTPHandler} from '@trpc/server/adapters/standalone';

export default createHTTPHandler({
  router: appRouter,
  basePath: '/api/trpc/',
});