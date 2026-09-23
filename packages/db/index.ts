import { env } from '@library/config';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from './generated/prisma/client.js';

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({connectionString: env.DATABASE_URL});

  return new PrismaClient({
    adapter,
    // query logging for development
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const prisma = createPrismaClient();

// closes database connection
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

export { Prisma } from './generated/prisma/client.js'
export type { PrismaClient } from './generated/prisma/client.js';
