/*
  Warnings:

  - A unique constraint covering the columns `[url]` on the table `Asset` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Asset_url_key" ON "Asset"("url");
