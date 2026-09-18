import dotenv from 'dotenv';
import {fileURLToPath} from 'node:url';
import {z} from 'zod';

// load env variables from .env file
dotenv.config({path: fileURLToPath(new URL('../../.env', import.meta.url))});

// defines the environment variables that the backend accepts.
// if you add a new environment variable, you must add it here.
const envSchema = z.object({
  // database url must exist and be a non-empty string
  DATABASE_URL: z.string().min(1),
  // node environment must be one of ['development', 'test', 'production'], defaults to development
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // port for the API server to listen on, defaults to 4000
  PORT: z.coerce.number().default(4000),
  // supabase project url
  SUPABASE_URL: z.string().url(),
  // supabase secret key - server-only 
  SUPABASE_SECRET_KEY: z.string().min(1),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const missing = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
  throw new Error(`Invalid environment variables: ${missing}`);
}

export const env = result.data;
