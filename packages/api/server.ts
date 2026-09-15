import {env} from '@library/config';
import {disconnectPrisma} from '@library/db';
import {createHTTPServer} from '@trpc/server/adapters/standalone';
import cors from 'cors';

import {appRouter} from './index';

const server = createHTTPServer({
  router: appRouter,
  middleware: cors({
    origin: 'http://localhost:5173',
  }),
});

server.listen(env.PORT, () => {
  console.log(`API server running on http://localhost:${env.PORT}`);
});

let shuttingDown = false;

// clean shutdown function to close the database connection when the server is stopped
async function shutdown(): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  server.close(async () => {
    await disconnectPrisma();
    process.exit(0);
  });
}

// exit database connection when the server is stopped
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);