import { appRouter, createContext } from './index.js';
import { createHTTPHandler } from '@trpc/server/adapters/standalone';
import cors from 'cors';
import http from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { CreateHTTPContextOptions } from '@trpc/server/adapters/standalone';

const ALLOWED_ORIGINS = ['https://icsf.github.io', 'http://localhost:5173'];

const corsMiddleware = cors({
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

const trpcHandler = createHTTPHandler({
  router: appRouter,
  createContext({ req }: CreateHTTPContextOptions) {
    const url = `http://localhost${req.url ?? '/'}`;
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) {
        headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      }
    }
    const fetchReq = new Request(url, {
      method: req.method ?? 'GET',
      headers,
    });
    return createContext(fetchReq);
  },
  basePath: '/api/',
  responseMeta(opts) {
    const isCatalogueList =
      opts.info?.calls.every((call) => call.path === 'catalogueList') ?? false;
    const allOk = opts.errors.length === 0;

    if (isCatalogueList && allOk) {
      return {
        headers: {
          'Cache-Control':
            'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
        },
      };
    }
    return {};
  },
});

const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
  corsMiddleware(req as never, res as never, () => {
    void trpcHandler(req, res);
  });
});

const PORT = process.env.PORT ?? 3000;
server.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
