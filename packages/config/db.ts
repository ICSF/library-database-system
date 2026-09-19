import { z } from 'zod';
import { loadEnv } from './load-env.js';

loadEnv();

// minimum environment variables for database
export const baseEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const result = baseEnvSchema.safeParse(process.env);

if (!result.success) {
  const missing = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
  throw new Error(`Invalid environment variables: ${missing}`);
}

export const env = result.data;