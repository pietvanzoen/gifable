-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "fileHash" TEXT,
    "labels" TEXT,
    "altText" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "color" TEXT,
    "size" INTEGER,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Media_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Media" ("altText", "color", "createdAt", "fileHash", "height", "id", "labels", "size", "thumbnailUrl", "updatedAt", "url", "userId", "width") SELECT "altText", "color", "createdAt", "fileHash", "height", "id", "labels", "size", "thumbnailUrl", "updatedAt", "url", "userId", "width" FROM "Media";
DROP TABLE "Media";
ALTER TABLE "new_Media" RENAME TO "Media";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
