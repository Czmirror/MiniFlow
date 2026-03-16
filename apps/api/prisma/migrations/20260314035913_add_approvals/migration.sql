-- CreateEnum
CREATE TYPE "ApprovalActionType" AS ENUM ('Approved', 'Rejected');

-- CreateTable
CREATE TABLE "approvals" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "actedBy" UUID NOT NULL,
    "actionType" "ApprovalActionType" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "approvals_requestId_createdAt_idx" ON "approvals"("requestId", "createdAt");

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
