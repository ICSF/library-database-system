import {env} from '@library/config';
import {PrismaPg} from '@prisma/adapter-pg';

import {PrismaClient} from './generated/prisma/client.ts';

// makes TypeScript aware of the global prisma variable for development hot reload
declare global {
  var prisma: PrismaClient|undefined;
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({connectionString: env.DATABASE_URL});

  return new PrismaClient({
    adapter,
    // query logging for development
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

// reuses existing Prisma client if it exists (for development hot reload)
export const prisma = globalThis.prisma ?? createPrismaClient();

// stores the client in the global object for reuse in development
if (env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

// closes database connection
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

export type {PrismaClient} from './generated/prisma/client';
