import {appRouter, createContext} from '@library/api';
import {createHTTPHandler} from '@trpc/server/adapters/standalone';
import cors from 'cors';
import type {IncomingMessage, ServerResponse} from 'node:http';

// set cors allowed origin for the info website too as it calls this API for catalogue
const ALLOWED_ORIGINS = ['https://icsf.github.io', 'http://localhost:5173'];

const corsMiddleware = cors({
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'], // for auth
});

const trpcHandler = createHTTPHandler({
  router: appRouter,
  createContext, // supabase jwt verification per request
  responseMeta(opts) {
    // cache just the public catalogue listing
    const isCatalogueList = opts.info?.calls.every((call) => call.path === 'catalogueList') ?? false;
    const allOk = opts.errors.length === 0;

    if (isCatalogueList && allOk) {
      return {
        headers: {
          // cache for 1 hour in the browser, 1 day in the CDN, and allow stale data for 7 days 
          'Cache-Control':
              'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800', 
                                                                                      
        },
      };
    }
    return {};
  },
});

// entry point for the API routes - checks against CORS policies before running procedure
export default function handler(req: IncomingMessage, res: ServerResponse): void {
  corsMiddleware(req as never, res as never, () => {
    void trpcHandler(req, res);
  });
}
