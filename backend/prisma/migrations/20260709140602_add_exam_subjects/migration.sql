-- CreateTable
CREATE TABLE "ExamSubject" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "totalMarks" DECIMAL(6,2) NOT NULL,

    CONSTRAINT "ExamSubject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExamSubject_schoolId_idx" ON "ExamSubject"("schoolId");

-- CreateIndex
CREATE INDEX "ExamSubject_examId_idx" ON "ExamSubject"("examId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSubject_examId_subject_key" ON "ExamSubject"("examId", "subject");

-- AddForeignKey
ALTER TABLE "ExamSubject" ADD CONSTRAINT "ExamSubject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSubject" ADD CONSTRAINT "ExamSubject_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
