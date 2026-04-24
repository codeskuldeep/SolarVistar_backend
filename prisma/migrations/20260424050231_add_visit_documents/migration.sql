-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "visitId" TEXT;

-- CreateIndex
CREATE INDEX "Document_visitId_idx" ON "Document"("visitId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
