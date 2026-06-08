import { PrismaClient } from '@prisma/client';

// Prisma client singleton. Next.js dev mode hot-reloads modules, which would
// otherwise spin up a new connection pool on every change — so we cache the
// client on globalThis.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
