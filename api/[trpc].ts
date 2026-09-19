import { appRouter, createContext } from '@library/api';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import type { IncomingMessage, ServerResponse } from 'node:http';

const ALLOWED_ORIGINS = ['https://icsf.github.io', 'http://localhost:5173'];

function setCorsHeaders(res: Response, origin: string | null) {
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
  }
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(
  req: IncomingMessage & { url: string },
  res: ServerResponse
): Promise<void> {
  const url = `https://${req.headers.host}${req.url}`;
  const origin = (req.headers.origin as string) ?? null;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin ?? '') ? origin! : '',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

  const fetchRequest = new Request(url, {
    method: req.method,
    headers: req.headers as HeadersInit,
    body: body?.length ? body : undefined,
  });

  const response = await fetchRequestHandler({
    endpoint: '/api',
    req: fetchRequest,
    router: appRouter,
    createContext: ({ req: fetchReq }) => createContext(fetchReq),
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

  setCorsHeaders(response, origin);

  res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
  const responseBody = await response.arrayBuffer();
  res.end(Buffer.from(responseBody));
}
