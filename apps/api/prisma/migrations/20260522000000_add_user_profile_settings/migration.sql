ALTER TABLE "users"
  ADD COLUMN "displayName" TEXT,
  ADD COLUMN "language" TEXT NOT NULL DEFAULT 'ja',
  ADD COLUMN "teamId" TEXT NOT NULL DEFAULT 'team-1',
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "users_teamId_isActive_idx" ON "users"("teamId", "isActive");
