// server setup for local development

import {env} from '@library/config';
import {disconnectPrisma} from '@library/db';
import {createHTTPServer} from '@trpc/server/adapters/standalone';
import cors from 'cors';

import {appRouter} from './index';

const ALLOWED_ORIGINS = ['http://localhost:5173'];

const server = createHTTPServer({
  router: appRouter,
  middleware: cors({origin: ALLOWED_ORIGINS}),
});

server.listen(env.PORT, () => {
  console.log(`API server running on http://localhost:${env.PORT}`);
});

// clean shutdown function to close HTTP and database connections when stopped
async function shutdown(): Promise<void> {
  server.close();
  server.closeAllConnections();

  try {
    await disconnectPrisma();
  } finally {
    process.exit();
  }
}

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());