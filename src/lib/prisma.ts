import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "node:path";
import process from "node:process";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function buildPrismaClient() {
  let url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:./prisma/dev.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;

  // If it's a local file, ensure it's an absolute path
  if (url.startsWith("file:")) {
    const relativePath = url.replace("file:", "");
    const absolutePath = path.resolve(process.cwd(), relativePath);
    url = `file:${absolutePath}`;
    console.log("Resolved Database URL:", url);
  }

  const adapter = new PrismaLibSql({ url, authToken });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || buildPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
