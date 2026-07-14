-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('active', 'inactive');

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "bFormNumber" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "fatherEmail" TEXT,
ADD COLUMN     "fatherIdCard" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "homeAddress" TEXT,
ADD COLUMN     "motherPhone" TEXT,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "placeOfBirth" TEXT,
ADD COLUMN     "previousSchool" TEXT,
ADD COLUMN     "religion" TEXT,
ADD COLUMN     "remarks" TEXT,
ADD COLUMN     "status" "StudentStatus" NOT NULL DEFAULT 'active',
ADD COLUMN     "studentCode" TEXT,
ADD COLUMN     "surname" TEXT,
ADD COLUMN     "whatsappNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Student_schoolId_studentCode_key" ON "Student"("schoolId", "studentCode");

