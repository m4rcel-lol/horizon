-- Permission for one account to act as another, granted and revoked without a
-- password ever changing hands.
CREATE TABLE "AccountDelegation" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "delegateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "AccountDelegation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountDelegation_ownerId_delegateId_key" ON "AccountDelegation"("ownerId", "delegateId");
CREATE INDEX "AccountDelegation_delegateId_status_idx" ON "AccountDelegation"("delegateId", "status");

ALTER TABLE "AccountDelegation" ADD CONSTRAINT "AccountDelegation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountDelegation" ADD CONSTRAINT "AccountDelegation_delegateId_fkey" FOREIGN KEY ("delegateId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Who actually opened a session, when it was opened by a delegate acting for
-- someone else. Null for an ordinary sign-in.
ALTER TABLE "UserSession" ADD COLUMN "delegatedById" TEXT;
