-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "parentUserId" TEXT;

-- CreateIndex
CREATE INDEX "Student_parentUserId_idx" ON "Student"("parentUserId");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
