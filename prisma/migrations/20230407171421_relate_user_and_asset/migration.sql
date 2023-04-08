/*
  Warnings:

  - Added the required column `userId` to the `Asset` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Asset" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "url" TEXT NOT NULL,
    "comment" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "color" TEXT,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "Asset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Asset" ("color", "comment", "createdAt", "height", "id", "updatedAt", "url", "width") SELECT "color", "comment", "createdAt", "height", "id", "updatedAt", "url", "width" FROM "Asset";
DROP TABLE "Asset";
ALTER TABLE "new_Asset" RENAME TO "Asset";
CREATE UNIQUE INDEX "Asset_url_key" ON "Asset"("url");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
