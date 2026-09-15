import {createHTTPServer} from '@trpc/server/adapters/standalone';
import cors from 'cors';

import {appRouter} from './index';

const server = createHTTPServer({
  router: appRouter,
  middleware: cors(),
});

server.listen(4000);
console.log('API server running on http://localhost:4000');