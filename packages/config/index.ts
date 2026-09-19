import { z } from 'zod';
import { loadEnv } from './load-env';
import { baseEnvSchema } from './db';

loadEnv();

// extends the base env var schema to include supabase keys
const fullEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(4000),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
});

const result = fullEnvSchema.safeParse(process.env);

if (!result.success) {
  const missing = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
  throw new Error(`Invalid environment variables: ${missing}`);
}

export const env = result.data;