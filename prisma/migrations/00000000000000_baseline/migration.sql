-- Baseline schema for a fresh production database.
-- Existing databases created before Prisma migrations should mark this
-- migration as applied after schema review, then run the hardening migration.
CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'SOMMELIER', 'STAFF', 'CUSTOMER');
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');
CREATE TYPE "DiningSection" AS ENUM ('DINING_ROOM', 'CHEFS_COUNTER', 'VAULT_ALCOVE');
CREATE TYPE "DiningService" AS ENUM ('LUNCH', 'DINNER');
CREATE TYPE "InquiryType" AS ENUM ('GENERAL', 'PRIVATE_DINING', 'CELLAR_MASTER', 'PRESS');
CREATE TYPE "InquiryStatus" AS ENUM ('UNREAD', 'IN_PROGRESS', 'RESOLVED');
CREATE TYPE "GalleryCategory" AS ENUM ('CULINARY', 'AMBIANCE', 'CELLAR', 'KITCHEN');

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "phone" TEXT,
  "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refresh_tokens" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "restaurants" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT 'AURA Edinburgh',
  "slug" TEXT NOT NULL DEFAULT 'aura-edinburgh',
  "stars" TEXT NOT NULL DEFAULT 'Two Michelin Stars',
  "chefPatron" TEXT NOT NULL DEFAULT 'Euan Macleod',
  "headSommelier" TEXT NOT NULL DEFAULT 'Fiona Sinclair',
  "address" TEXT NOT NULL DEFAULT '14–16 Royal Terrace Vaults, Edinburgh, EH7 5TB, Scotland',
  "phone" TEXT NOT NULL DEFAULT '+44 (0)131 556 8920',
  "email" TEXT NOT NULL DEFAULT 'reservations@aura-edinburgh.com',
  "maxCapacity" INTEGER NOT NULL DEFAULT 28,
  "openingHours" JSONB NOT NULL,
  "coordinates" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "categories" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dishes" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "gaelicName" TEXT,
  "categoryId" TEXT NOT NULL,
  "courseNumber" INTEGER,
  "description" TEXT NOT NULL,
  "story" TEXT NOT NULL,
  "provenance" TEXT NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "image" TEXT NOT NULL,
  "isSignature" BOOLEAN NOT NULL DEFAULT false,
  "isChefRecommendation" BOOLEAN NOT NULL DEFAULT false,
  "winePairing" JSONB,
  "dietary" TEXT[],
  "allergens" TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dishes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tasting_menus" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "pairingPrice" DECIMAL(10,2) NOT NULL,
  "prestigePairingPrice" DECIMAL(10,2) NOT NULL,
  "coursesCount" INTEGER NOT NULL DEFAULT 8,
  "duration" TEXT NOT NULL DEFAULT '3 hours',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "courses" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tasting_menus_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dining_tables" (
  "id" TEXT NOT NULL,
  "tableNumber" INTEGER NOT NULL,
  "capacity" INTEGER NOT NULL,
  "section" "DiningSection" NOT NULL DEFAULT 'DINING_ROOM',
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dining_tables_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reservations" (
  "id" TEXT NOT NULL,
  "confirmationCode" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "timeSlot" TEXT NOT NULL,
  "service" "DiningService" NOT NULL DEFAULT 'DINNER',
  "guestsCount" INTEGER NOT NULL,
  "status" "ReservationStatus" NOT NULL DEFAULT 'CONFIRMED',
  "experienceName" TEXT NOT NULL,
  "pairingTier" TEXT NOT NULL DEFAULT 'none',
  "seatingPreference" "DiningSection" NOT NULL DEFAULT 'DINING_ROOM',
  "fullName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "dietaryNotes" TEXT,
  "specialOccasion" TEXT,
  "totalEstimate" DECIMAL(10,2) NOT NULL,
  "depositAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  "idempotencyKey" TEXT,
  "idempotencyHash" TEXT,
  "policyAcceptedAt" TIMESTAMP(3),
  "policyVersion" TEXT,
  "holdExpiresAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "cancellationReason" TEXT,
  "tableId" TEXT,
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payments" (
  "id" TEXT NOT NULL,
  "reservationId" TEXT NOT NULL,
  "stripePaymentIntentId" TEXT,
  "stripeClientSecret" TEXT,
  "idempotencyKey" TEXT,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'gbp',
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_events" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "paymentId" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cellar_items" (
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

CREATE TABLE "reviews" (
  "id" TEXT NOT NULL,
  "publication" TEXT NOT NULL,
  "author" TEXT NOT NULL,
  "quote" TEXT NOT NULL,
  "rating" TEXT NOT NULL,
  "year" TEXT NOT NULL,
  "badge" TEXT,
  "isApproved" BOOLEAN NOT NULL DEFAULT true,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "gallery_items" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" "GalleryCategory" NOT NULL DEFAULT 'CULINARY',
  "imageUrl" TEXT NOT NULL,
  "publicId" TEXT,
  "caption" TEXT,
  "aspect" TEXT NOT NULL DEFAULT 'square',
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "gallery_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contact_messages" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "inquiryType" "InquiryType" NOT NULL DEFAULT 'GENERAL',
  "status" "InquiryStatus" NOT NULL DEFAULT 'UNREAD',
  "preferredDate" DATE,
  "guestsCount" INTEGER,
  "message" TEXT NOT NULL,
  "replyNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "newsletter_subscribers" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");
CREATE UNIQUE INDEX "restaurants_slug_key" ON "restaurants"("slug");
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
CREATE UNIQUE INDEX "dishes_slug_key" ON "dishes"("slug");
CREATE INDEX "dishes_categoryId_idx" ON "dishes"("categoryId");
CREATE UNIQUE INDEX "tasting_menus_slug_key" ON "tasting_menus"("slug");
CREATE UNIQUE INDEX "dining_tables_tableNumber_key" ON "dining_tables"("tableNumber");
CREATE UNIQUE INDEX "reservations_confirmationCode_key" ON "reservations"("confirmationCode");
CREATE UNIQUE INDEX "reservations_idempotencyKey_key" ON "reservations"("idempotencyKey");
CREATE INDEX "reservations_date_timeSlot_idx" ON "reservations"("date", "timeSlot");
CREATE INDEX "reservations_email_idx" ON "reservations"("email");
CREATE UNIQUE INDEX "payments_reservationId_key" ON "payments"("reservationId");
CREATE UNIQUE INDEX "payments_stripePaymentIntentId_key" ON "payments"("stripePaymentIntentId");
CREATE UNIQUE INDEX "payments_idempotencyKey_key" ON "payments"("idempotencyKey");
CREATE UNIQUE INDEX "payment_events_eventId_key" ON "payment_events"("eventId");
CREATE INDEX "payment_events_paymentId_idx" ON "payment_events"("paymentId");
CREATE INDEX "cellar_items_name_idx" ON "cellar_items"("name");
CREATE UNIQUE INDEX "newsletter_subscribers_email_key" ON "newsletter_subscribers"("email");

ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dishes" ADD CONSTRAINT "dishes_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "dining_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
