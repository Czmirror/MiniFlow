ALTER TABLE "users"
  ADD COLUMN "role" TEXT NOT NULL DEFAULT 'Applicant';

DROP INDEX IF EXISTS "users_teamId_isActive_idx";
CREATE INDEX "users_teamId_role_isActive_idx" ON "users"("teamId", "role", "isActive");
