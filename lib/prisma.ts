import { PrismaClient } from "@prisma/client";

declare global {
    var prisma: PrismaClient | undefined;
}

if (!process.env.PRISMA_DISABLE_PREPARED_STATEMENTS) {
    // Supabase with PgBouncer rejects reused prepared statements, so fall back to simple queries.
    process.env.PRISMA_DISABLE_PREPARED_STATEMENTS = "true";
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

export default prisma;
