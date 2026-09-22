ALTER TABLE "reservations"
  ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT,
  ADD COLUMN IF NOT EXISTS "idempotencyHash" TEXT,
  ADD COLUMN IF NOT EXISTS "policyAcceptedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "policyVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "holdExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "reservations_idempotencyKey_key"
  ON "reservations"("idempotencyKey");

ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "payments_idempotencyKey_key"
  ON "payments"("idempotencyKey");

CREATE TABLE IF NOT EXISTS "payment_events" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "paymentId" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_events_eventId_key"
  ON "payment_events"("eventId");
CREATE INDEX IF NOT EXISTS "payment_events_paymentId_idx"
  ON "payment_events"("paymentId");
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_events_paymentId_fkey'
  ) THEN
    ALTER TABLE "payment_events"
      ADD CONSTRAINT "payment_events_paymentId_fkey"
      FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "cellar_items" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "vintage" TEXT,
  "region" TEXT,
  "stockBottles" INTEGER NOT NULL DEFAULT 0,
  "pairingWith" TEXT,
  "allocationStatus" TEXT,
  "temperatureZone" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cellar_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "cellar_items_name_idx" ON "cellar_items"("name");
