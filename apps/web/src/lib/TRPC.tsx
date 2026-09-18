import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@library/api';
import { supabase } from './SupabaseClient';

const apiUrl = import.meta.env.VITE_API_URL; 

if (!apiUrl) {
    throw new Error('Missing VITE_API_URL env var');
}

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${apiUrl}/api`,
      async headers() {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // public procedures (like catalogueList) work fine with no header.
        // protected procedures will reject the request if this is missing.
        return session ? { Authorization: `Bearer ${session.access_token}` } : {};
      },
    }),
  ],
});
