-- Suspension gains the detail a bare status flag could not carry: why, by
-- whom, since when, and until when.
ALTER TABLE "User" ADD COLUMN "suspensionReason" TEXT;
ALTER TABLE "User" ADD COLUMN "suspendedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "suspendedById" TEXT;
ALTER TABLE "User" ADD COLUMN "suspendedUntil" TIMESTAMP(3);

-- Every handle an account has used. An audit trail, not a routing table:
-- old handles are released rather than redirected.
CREATE TABLE "UsernameChange" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromUsername" TEXT NOT NULL,
    "toUsername" TEXT NOT NULL,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsernameChange_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UsernameChange_userId_createdAt_idx" ON "UsernameChange"("userId", "createdAt" DESC);
CREATE INDEX "UsernameChange_fromUsername_idx" ON "UsernameChange"("fromUsername");

ALTER TABLE "UsernameChange" ADD CONSTRAINT "UsernameChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
