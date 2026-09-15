import {env} from '@library/config';
import {PrismaPg} from '@prisma/adapter-pg';

import {PrismaClient} from './generated/prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient|undefined;
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({connectionString: env.DATABASE_URL});

  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const prisma = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

export type {PrismaClient} from './generated/prisma/client';
