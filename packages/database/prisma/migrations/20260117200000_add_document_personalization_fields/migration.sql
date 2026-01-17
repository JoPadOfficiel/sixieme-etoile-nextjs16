-- Migration: Add Document Personalization Fields
-- Story 25.3 and 25.2: EU-Compliant Invoice Legal Info and Document Personalization

-- Create LogoPosition enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "LogoPosition" AS ENUM ('LEFT', 'RIGHT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create DocumentLanguage enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "DocumentLanguage" AS ENUM ('FRENCH', 'ENGLISH', 'BILINGUAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add document personalization fields
ALTER TABLE "organization_pricing_settings" ADD COLUMN IF NOT EXISTS "documentLogoUrl" TEXT;
ALTER TABLE "organization_pricing_settings" ADD COLUMN IF NOT EXISTS "brandColor" TEXT DEFAULT '#2563eb';
ALTER TABLE "organization_pricing_settings" ADD COLUMN IF NOT EXISTS "logoPosition" "LogoPosition" DEFAULT 'LEFT';
ALTER TABLE "organization_pricing_settings" ADD COLUMN IF NOT EXISTS "showCompanyName" BOOLEAN DEFAULT true;
ALTER TABLE "organization_pricing_settings" ADD COLUMN IF NOT EXISTS "logoWidth" INTEGER DEFAULT 150;

-- Add legal info fields
ALTER TABLE "organization_pricing_settings" ADD COLUMN IF NOT EXISTS "legalName" TEXT;
ALTER TABLE "organization_pricing_settings" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "organization_pricing_settings" ADD COLUMN IF NOT EXISTS "addressLine2" TEXT;
ALTER TABLE "organization_pricing_settings" ADD COLUMN IF NOT EXISTS "postalCode" TEXT;
ALTER TABLE "organization_pricing_settings" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "organization_pricing_settings" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "organization_pricing_settings" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "organization_pricing_settings" ADD COLUMN IF NOT EXISTS "siret" TEXT;
ALTER TABLE "organization_pricing_settings" ADD COLUMN IF NOT EXISTS "vatNumber" TEXT;
ALTER TABLE "organization_pricing_settings" ADD COLUMN IF NOT EXISTS "iban" TEXT;
ALTER TABLE "organization_pricing_settings" ADD COLUMN IF NOT EXISTS "bic" TEXT;

-- Add document language and terms fields
ALTER TABLE "organization_pricing_settings" ADD COLUMN IF NOT EXISTS "documentLanguage" "DocumentLanguage" DEFAULT 'BILINGUAL';
ALTER TABLE "organization_pricing_settings" ADD COLUMN IF NOT EXISTS "invoiceTerms" TEXT;
ALTER TABLE "organization_pricing_settings" ADD COLUMN IF NOT EXISTS "quoteTerms" TEXT;
ALTER TABLE "organization_pricing_settings" ADD COLUMN IF NOT EXISTS "missionOrderTerms" TEXT;
