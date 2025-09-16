-- CreateEnum
CREATE TYPE "public"."EventType" AS ENUM ('LOOKING_AWAY', 'NO_FACE', 'MULTIPLE_FACES', 'OBJECT_DETECTED', 'EYE_CLOSED', 'AUDIO_SUSPICIOUS');

-- CreateTable
CREATE TABLE "public"."Candidate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "videoUrl" TEXT,
    "integrityScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Event" (
    "id" TEXT NOT NULL,
    "type" "public"."EventType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER,
    "label" TEXT,
    "confidence" DOUBLE PRECISION,
    "meta" JSONB,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Report" (
    "id" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_email_key" ON "public"."Candidate"("email");

-- CreateIndex
CREATE INDEX "Candidate_name_idx" ON "public"."Candidate"("name");

-- CreateIndex
CREATE INDEX "Candidate_createdAt_idx" ON "public"."Candidate"("createdAt");

-- CreateIndex
CREATE INDEX "Session_candidateId_idx" ON "public"."Session"("candidateId");

-- CreateIndex
CREATE INDEX "Session_startTime_idx" ON "public"."Session"("startTime");

-- CreateIndex
CREATE INDEX "Session_integrityScore_idx" ON "public"."Session"("integrityScore");

-- CreateIndex
CREATE INDEX "Event_sessionId_timestamp_idx" ON "public"."Event"("sessionId", "timestamp");

-- CreateIndex
CREATE INDEX "Event_type_idx" ON "public"."Event"("type");

-- CreateIndex
CREATE INDEX "Event_label_idx" ON "public"."Event"("label");

-- CreateIndex
CREATE INDEX "Report_sessionId_idx" ON "public"."Report"("sessionId");

-- CreateIndex
CREATE INDEX "Report_generatedAt_idx" ON "public"."Report"("generatedAt");

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "public"."Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Report" ADD CONSTRAINT "Report_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
