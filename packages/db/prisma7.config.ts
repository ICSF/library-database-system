import {env} from '@library/config/db.js';
import {defineConfig} from 'prisma/config';

// sets out the configuration for Prisma:
// where the schema is, where the migrations are, and what the database connection string is.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env.DATABASE_URL,
  },
});
