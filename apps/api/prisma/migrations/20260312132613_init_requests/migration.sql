-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('Draft', 'Pending', 'Approved', 'Rejected', 'Deleted');

-- CreateTable
CREATE TABLE "requests" (
    "id" UUID NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdBy" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "requests_teamId_status_createdAt_idx" ON "requests"("teamId", "status", "createdAt");
