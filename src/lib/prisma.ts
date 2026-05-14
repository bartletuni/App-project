import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function buildPrismaClient() {
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:./prisma/dev.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;

  const client = createClient({ url, authToken });
  const adapter = new PrismaLibSql(client);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || buildPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
