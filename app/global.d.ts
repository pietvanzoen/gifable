import type { PrismaClient } from "@prisma/client";

declare global {
  var __stroage: FileStorage | undefined;
  var __db: PrismaClient | undefined;
}
