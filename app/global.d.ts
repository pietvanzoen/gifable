import type { PrismaClient } from "@prisma/client";
import type FileStorage from "./utils/file-storage";

declare global {
  var __stroage: FileStorage | undefined;
  var __db: PrismaClient | undefined;
}
