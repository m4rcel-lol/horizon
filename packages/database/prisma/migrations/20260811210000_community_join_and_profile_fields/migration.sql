-- Additive only. Never drops tables or truncates data.

-- Profile fields on User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pronouns" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "birthday" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "automatedById" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "automatedPending" BOOLEAN NOT NULL DEFAULT false;

-- UserSettings accent
ALTER TABLE "UserSettings" ADD COLUMN IF NOT EXISTS "accentColor" TEXT NOT NULL DEFAULT '#1d9bf0';

-- Join mode enum + community columns
DO $$ BEGIN
  CREATE TYPE "CommunityJoinMode" AS ENUM ('OPEN', 'REQUEST');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Community" ADD COLUMN IF NOT EXISTS "joinMode" "CommunityJoinMode" NOT NULL DEFAULT 'OPEN';
ALTER TABLE "Community" ADD COLUMN IF NOT EXISTS "verification" "VerificationType" NOT NULL DEFAULT 'NONE';

-- Join requests
CREATE TABLE IF NOT EXISTS "CommunityJoinRequest" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    CONSTRAINT "CommunityJoinRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CommunityJoinRequest_communityId_userId_key"
  ON "CommunityJoinRequest"("communityId", "userId");
CREATE INDEX IF NOT EXISTS "CommunityJoinRequest_communityId_status_idx"
  ON "CommunityJoinRequest"("communityId", "status");
CREATE INDEX IF NOT EXISTS "CommunityJoinRequest_userId_idx"
  ON "CommunityJoinRequest"("userId");

DO $$ BEGIN
  ALTER TABLE "CommunityJoinRequest"
    ADD CONSTRAINT "CommunityJoinRequest_communityId_fkey"
    FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "CommunityJoinRequest"
    ADD CONSTRAINT "CommunityJoinRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
