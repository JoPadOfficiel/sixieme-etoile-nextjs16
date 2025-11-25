-- CreateEnum
CREATE TYPE "PurchaseType" AS ENUM ('SUBSCRIPTION', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('INDIVIDUAL', 'BUSINESS', 'AGENCY');

-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('PARTNER', 'PRIVATE');

-- CreateEnum
CREATE TYPE "VehicleRegulatoryCategory" AS ENUM ('LIGHT', 'HEAVY');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "DriverEmploymentStatus" AS ENUM ('EMPLOYEE', 'CONTRACTOR', 'FREELANCE');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PricingMode" AS ENUM ('FIXED_GRID', 'DYNAMIC');

-- CreateEnum
CREATE TYPE "TripType" AS ENUM ('TRANSFER', 'EXCURSION', 'DISPO', 'OFF_GRID');

-- CreateEnum
CREATE TYPE "AmountType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "ZoneType" AS ENUM ('POLYGON', 'RADIUS', 'POINT');

-- CreateEnum
CREATE TYPE "RouteDirection" AS ENUM ('BIDIRECTIONAL', 'A_TO_B', 'B_TO_A');

-- CreateEnum
CREATE TYPE "AdvancedRateAppliesTo" AS ENUM ('NIGHT', 'WEEKEND', 'LONG_DISTANCE', 'ZONE_SCENARIO', 'HOLIDAY');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('GASOLINE', 'DIESEL', 'LPG');

-- CreateEnum
CREATE TYPE "InvoiceLineType" AS ENUM ('SERVICE', 'OPTIONAL_FEE', 'PROMOTION_ADJUSTMENT', 'OTHER');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "username" TEXT,
    "role" TEXT,
    "banned" BOOLEAN,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "impersonatedBy" TEXT,
    "activeOrganizationId" TEXT,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "password" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passkey" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "publicKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "webauthnUserID" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "deviceType" TEXT NOT NULL,
    "backedUp" BOOLEAN NOT NULL,
    "transports" TEXT,
    "createdAt" TIMESTAMP(3),

    CONSTRAINT "passkey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "metadata" TEXT,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "inviterId" TEXT NOT NULL,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,
    "type" "PurchaseType" NOT NULL,
    "customerId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "productId" TEXT NOT NULL,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "ContactType" NOT NULL DEFAULT 'INDIVIDUAL',
    "displayName" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "companyName" TEXT,
    "vatNumber" TEXT,
    "siret" TEXT,
    "billingAddress" TEXT,
    "isPartner" BOOLEAN NOT NULL DEFAULT false,
    "defaultClientType" "ClientType" NOT NULL DEFAULT 'PRIVATE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_category" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "regulatoryCategory" "VehicleRegulatoryCategory" NOT NULL DEFAULT 'LIGHT',
    "maxPassengers" INTEGER NOT NULL,
    "maxLuggageVolume" INTEGER,
    "priceMultiplier" DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    "defaultRatePerKm" DECIMAL(10,4),
    "defaultRatePerHour" DECIMAL(10,2),
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operating_base" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL DEFAULT 'FR',
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operating_base_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vehicleCategoryId" TEXT NOT NULL,
    "operatingBaseId" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "internalName" TEXT,
    "vin" TEXT,
    "passengerCapacity" INTEGER NOT NULL,
    "luggageCapacity" INTEGER,
    "consumptionLPer100Km" DECIMAL(5,2),
    "averageSpeedKmh" INTEGER,
    "costPerKm" DECIMAL(10,4),
    "requiredLicenseCategoryId" TEXT,
    "status" "VehicleStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_category" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "license_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_license_rule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "licenseCategoryId" TEXT NOT NULL,
    "maxDailyDrivingHours" DECIMAL(4,2) NOT NULL,
    "maxDailyAmplitudeHours" DECIMAL(4,2) NOT NULL,
    "breakMinutesPerDrivingBlock" INTEGER NOT NULL,
    "drivingBlockHoursForBreak" DECIMAL(4,2) NOT NULL,
    "cappedAverageSpeedKmh" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_license_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "employmentStatus" "DriverEmploymentStatus" NOT NULL DEFAULT 'EMPLOYEE',
    "hourlyCost" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_license" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "licenseCategoryId" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_license_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_zone" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "zoneType" "ZoneType" NOT NULL DEFAULT 'POLYGON',
    "geometry" JSONB,
    "centerLatitude" DECIMAL(10,7),
    "centerLongitude" DECIMAL(10,7),
    "parentZoneId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zone_route" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fromZoneId" TEXT NOT NULL,
    "toZoneId" TEXT NOT NULL,
    "vehicleCategoryId" TEXT NOT NULL,
    "direction" "RouteDirection" NOT NULL DEFAULT 'BIDIRECTIONAL',
    "fixedPrice" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zone_route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "excursion_package" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "originZoneId" TEXT,
    "destinationZoneId" TEXT,
    "vehicleCategoryId" TEXT NOT NULL,
    "includedDurationHours" DECIMAL(5,2) NOT NULL,
    "includedDistanceKm" DECIMAL(8,2) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "excursion_package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispo_package" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "vehicleCategoryId" TEXT NOT NULL,
    "includedDurationHours" DECIMAL(5,2) NOT NULL,
    "includedDistanceKm" DECIMAL(8,2) NOT NULL,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "overageRatePerKm" DECIMAL(10,4) NOT NULL,
    "overageRatePerHour" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispo_package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_pricing_settings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "baseRatePerKm" DECIMAL(10,4) NOT NULL,
    "baseRatePerHour" DECIMAL(10,2) NOT NULL,
    "defaultMarginPercent" DECIMAL(5,2) NOT NULL,
    "minimumFare" DECIMAL(10,2) NOT NULL,
    "roundingRule" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_pricing_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advanced_rate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "appliesTo" "AdvancedRateAppliesTo" NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "daysOfWeek" TEXT,
    "minDistanceKm" DECIMAL(8,2),
    "maxDistanceKm" DECIMAL(8,2),
    "zoneId" TEXT,
    "adjustmentType" "AdjustmentType" NOT NULL,
    "value" DECIMAL(10,4) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advanced_rate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasonal_multiplier" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "multiplier" DECIMAL(5,3) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasonal_multiplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "optional_fee" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amountType" "AmountType" NOT NULL,
    "amount" DECIMAL(10,4) NOT NULL,
    "isTaxable" BOOLEAN NOT NULL DEFAULT true,
    "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 20.0,
    "autoApplyRules" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "optional_fee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" "AmountType" NOT NULL,
    "value" DECIMAL(10,4) NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "maxTotalUses" INTEGER,
    "maxUsesPerContact" INTEGER,
    "currentUses" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empty_leg_opportunity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "fromZoneId" TEXT,
    "toZoneId" TEXT,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "pricingStrategy" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empty_leg_opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "pricingMode" "PricingMode" NOT NULL,
    "tripType" "TripType" NOT NULL,
    "pickupAt" TIMESTAMP(3) NOT NULL,
    "pickupAddress" TEXT NOT NULL,
    "pickupLatitude" DECIMAL(10,7),
    "pickupLongitude" DECIMAL(10,7),
    "dropoffAddress" TEXT NOT NULL,
    "dropoffLatitude" DECIMAL(10,7),
    "dropoffLongitude" DECIMAL(10,7),
    "passengerCount" INTEGER NOT NULL,
    "luggageCount" INTEGER NOT NULL DEFAULT 0,
    "vehicleCategoryId" TEXT NOT NULL,
    "suggestedPrice" DECIMAL(10,2) NOT NULL,
    "finalPrice" DECIMAL(10,2) NOT NULL,
    "internalCost" DECIMAL(10,2),
    "marginPercent" DECIMAL(5,2),
    "tripAnalysis" JSONB,
    "appliedRules" JSONB,
    "validUntil" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "quoteId" TEXT,
    "contactId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issueDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "totalExclVat" DECIMAL(10,2) NOT NULL,
    "totalVat" DECIMAL(10,2) NOT NULL,
    "totalInclVat" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "commissionAmount" DECIMAL(10,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "lineType" "InvoiceLineType" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unitPriceExclVat" DECIMAL(10,4) NOT NULL,
    "vatRate" DECIMAL(5,2) NOT NULL,
    "totalExclVat" DECIMAL(10,2) NOT NULL,
    "totalVat" DECIMAL(10,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_type" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "document_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "documentTypeId" TEXT NOT NULL,
    "quoteId" TEXT,
    "invoiceId" TEXT,
    "storagePath" TEXT,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_price_cache" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL DEFAULT 'FR',
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "fuelType" "FuelType" NOT NULL,
    "pricePerLitre" DECIMAL(10,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "source" TEXT NOT NULL DEFAULT 'COLLECT_API',
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fuel_price_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_integration_settings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "googleMapsApiKey" TEXT,
    "collectApiKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_integration_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "organization_slug_key" ON "organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "member_userId_organizationId_key" ON "member"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_subscriptionId_key" ON "Purchase"("subscriptionId");

-- CreateIndex
CREATE INDEX "Purchase_subscriptionId_idx" ON "Purchase"("subscriptionId");

-- CreateIndex
CREATE INDEX "contact_organizationId_idx" ON "contact"("organizationId");

-- CreateIndex
CREATE INDEX "contact_email_idx" ON "contact"("email");

-- CreateIndex
CREATE INDEX "contact_isPartner_idx" ON "contact"("isPartner");

-- CreateIndex
CREATE INDEX "vehicle_category_organizationId_idx" ON "vehicle_category"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_category_organizationId_code_key" ON "vehicle_category"("organizationId", "code");

-- CreateIndex
CREATE INDEX "operating_base_organizationId_idx" ON "operating_base"("organizationId");

-- CreateIndex
CREATE INDEX "vehicle_organizationId_idx" ON "vehicle"("organizationId");

-- CreateIndex
CREATE INDEX "vehicle_vehicleCategoryId_idx" ON "vehicle"("vehicleCategoryId");

-- CreateIndex
CREATE INDEX "vehicle_operatingBaseId_idx" ON "vehicle"("operatingBaseId");

-- CreateIndex
CREATE INDEX "vehicle_status_idx" ON "vehicle"("status");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_organizationId_registrationNumber_key" ON "vehicle"("organizationId", "registrationNumber");

-- CreateIndex
CREATE INDEX "license_category_organizationId_idx" ON "license_category"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "license_category_organizationId_code_key" ON "license_category"("organizationId", "code");

-- CreateIndex
CREATE INDEX "organization_license_rule_organizationId_idx" ON "organization_license_rule"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_license_rule_organizationId_licenseCategoryId_key" ON "organization_license_rule"("organizationId", "licenseCategoryId");

-- CreateIndex
CREATE INDEX "driver_organizationId_idx" ON "driver"("organizationId");

-- CreateIndex
CREATE INDEX "driver_isActive_idx" ON "driver"("isActive");

-- CreateIndex
CREATE INDEX "driver_license_driverId_idx" ON "driver_license"("driverId");

-- CreateIndex
CREATE INDEX "driver_license_licenseCategoryId_idx" ON "driver_license"("licenseCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "driver_license_driverId_licenseCategoryId_key" ON "driver_license"("driverId", "licenseCategoryId");

-- CreateIndex
CREATE INDEX "pricing_zone_organizationId_idx" ON "pricing_zone"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_zone_organizationId_code_key" ON "pricing_zone"("organizationId", "code");

-- CreateIndex
CREATE INDEX "zone_route_organizationId_idx" ON "zone_route"("organizationId");

-- CreateIndex
CREATE INDEX "zone_route_fromZoneId_toZoneId_idx" ON "zone_route"("fromZoneId", "toZoneId");

-- CreateIndex
CREATE INDEX "zone_route_vehicleCategoryId_idx" ON "zone_route"("vehicleCategoryId");

-- CreateIndex
CREATE INDEX "excursion_package_organizationId_idx" ON "excursion_package"("organizationId");

-- CreateIndex
CREATE INDEX "excursion_package_vehicleCategoryId_idx" ON "excursion_package"("vehicleCategoryId");

-- CreateIndex
CREATE INDEX "dispo_package_organizationId_idx" ON "dispo_package"("organizationId");

-- CreateIndex
CREATE INDEX "dispo_package_vehicleCategoryId_idx" ON "dispo_package"("vehicleCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_pricing_settings_organizationId_key" ON "organization_pricing_settings"("organizationId");

-- CreateIndex
CREATE INDEX "advanced_rate_organizationId_idx" ON "advanced_rate"("organizationId");

-- CreateIndex
CREATE INDEX "advanced_rate_appliesTo_idx" ON "advanced_rate"("appliesTo");

-- CreateIndex
CREATE INDEX "seasonal_multiplier_organizationId_idx" ON "seasonal_multiplier"("organizationId");

-- CreateIndex
CREATE INDEX "seasonal_multiplier_startDate_endDate_idx" ON "seasonal_multiplier"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "optional_fee_organizationId_idx" ON "optional_fee"("organizationId");

-- CreateIndex
CREATE INDEX "promotion_organizationId_idx" ON "promotion"("organizationId");

-- CreateIndex
CREATE INDEX "promotion_validFrom_validTo_idx" ON "promotion"("validFrom", "validTo");

-- CreateIndex
CREATE UNIQUE INDEX "promotion_organizationId_code_key" ON "promotion"("organizationId", "code");

-- CreateIndex
CREATE INDEX "empty_leg_opportunity_organizationId_idx" ON "empty_leg_opportunity"("organizationId");

-- CreateIndex
CREATE INDEX "empty_leg_opportunity_vehicleId_idx" ON "empty_leg_opportunity"("vehicleId");

-- CreateIndex
CREATE INDEX "empty_leg_opportunity_windowStart_windowEnd_idx" ON "empty_leg_opportunity"("windowStart", "windowEnd");

-- CreateIndex
CREATE INDEX "quote_organizationId_idx" ON "quote"("organizationId");

-- CreateIndex
CREATE INDEX "quote_contactId_idx" ON "quote"("contactId");

-- CreateIndex
CREATE INDEX "quote_status_idx" ON "quote"("status");

-- CreateIndex
CREATE INDEX "quote_pickupAt_idx" ON "quote"("pickupAt");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_quoteId_key" ON "invoice"("quoteId");

-- CreateIndex
CREATE INDEX "invoice_organizationId_idx" ON "invoice"("organizationId");

-- CreateIndex
CREATE INDEX "invoice_contactId_idx" ON "invoice"("contactId");

-- CreateIndex
CREATE INDEX "invoice_status_idx" ON "invoice"("status");

-- CreateIndex
CREATE INDEX "invoice_issueDate_idx" ON "invoice"("issueDate");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_organizationId_number_key" ON "invoice"("organizationId", "number");

-- CreateIndex
CREATE INDEX "invoice_line_invoiceId_idx" ON "invoice_line"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "document_type_code_key" ON "document_type"("code");

-- CreateIndex
CREATE INDEX "document_organizationId_idx" ON "document"("organizationId");

-- CreateIndex
CREATE INDEX "document_documentTypeId_idx" ON "document"("documentTypeId");

-- CreateIndex
CREATE INDEX "document_invoiceId_idx" ON "document"("invoiceId");

-- CreateIndex
CREATE INDEX "fuel_price_cache_countryCode_fuelType_idx" ON "fuel_price_cache"("countryCode", "fuelType");

-- CreateIndex
CREATE INDEX "fuel_price_cache_fetchedAt_idx" ON "fuel_price_cache"("fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "organization_integration_settings_organizationId_key" ON "organization_integration_settings"("organizationId");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passkey" ADD CONSTRAINT "passkey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact" ADD CONSTRAINT "contact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_category" ADD CONSTRAINT "vehicle_category_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operating_base" ADD CONSTRAINT "operating_base_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle" ADD CONSTRAINT "vehicle_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle" ADD CONSTRAINT "vehicle_vehicleCategoryId_fkey" FOREIGN KEY ("vehicleCategoryId") REFERENCES "vehicle_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle" ADD CONSTRAINT "vehicle_operatingBaseId_fkey" FOREIGN KEY ("operatingBaseId") REFERENCES "operating_base"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle" ADD CONSTRAINT "vehicle_requiredLicenseCategoryId_fkey" FOREIGN KEY ("requiredLicenseCategoryId") REFERENCES "license_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_category" ADD CONSTRAINT "license_category_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_license_rule" ADD CONSTRAINT "organization_license_rule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_license_rule" ADD CONSTRAINT "organization_license_rule_licenseCategoryId_fkey" FOREIGN KEY ("licenseCategoryId") REFERENCES "license_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver" ADD CONSTRAINT "driver_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_license" ADD CONSTRAINT "driver_license_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_license" ADD CONSTRAINT "driver_license_licenseCategoryId_fkey" FOREIGN KEY ("licenseCategoryId") REFERENCES "license_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_zone" ADD CONSTRAINT "pricing_zone_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_zone" ADD CONSTRAINT "pricing_zone_parentZoneId_fkey" FOREIGN KEY ("parentZoneId") REFERENCES "pricing_zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_route" ADD CONSTRAINT "zone_route_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_route" ADD CONSTRAINT "zone_route_fromZoneId_fkey" FOREIGN KEY ("fromZoneId") REFERENCES "pricing_zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_route" ADD CONSTRAINT "zone_route_toZoneId_fkey" FOREIGN KEY ("toZoneId") REFERENCES "pricing_zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_route" ADD CONSTRAINT "zone_route_vehicleCategoryId_fkey" FOREIGN KEY ("vehicleCategoryId") REFERENCES "vehicle_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "excursion_package" ADD CONSTRAINT "excursion_package_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "excursion_package" ADD CONSTRAINT "excursion_package_originZoneId_fkey" FOREIGN KEY ("originZoneId") REFERENCES "pricing_zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "excursion_package" ADD CONSTRAINT "excursion_package_destinationZoneId_fkey" FOREIGN KEY ("destinationZoneId") REFERENCES "pricing_zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "excursion_package" ADD CONSTRAINT "excursion_package_vehicleCategoryId_fkey" FOREIGN KEY ("vehicleCategoryId") REFERENCES "vehicle_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispo_package" ADD CONSTRAINT "dispo_package_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispo_package" ADD CONSTRAINT "dispo_package_vehicleCategoryId_fkey" FOREIGN KEY ("vehicleCategoryId") REFERENCES "vehicle_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_pricing_settings" ADD CONSTRAINT "organization_pricing_settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advanced_rate" ADD CONSTRAINT "advanced_rate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advanced_rate" ADD CONSTRAINT "advanced_rate_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "pricing_zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seasonal_multiplier" ADD CONSTRAINT "seasonal_multiplier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optional_fee" ADD CONSTRAINT "optional_fee_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion" ADD CONSTRAINT "promotion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empty_leg_opportunity" ADD CONSTRAINT "empty_leg_opportunity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empty_leg_opportunity" ADD CONSTRAINT "empty_leg_opportunity_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empty_leg_opportunity" ADD CONSTRAINT "empty_leg_opportunity_fromZoneId_fkey" FOREIGN KEY ("fromZoneId") REFERENCES "pricing_zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empty_leg_opportunity" ADD CONSTRAINT "empty_leg_opportunity_toZoneId_fkey" FOREIGN KEY ("toZoneId") REFERENCES "pricing_zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote" ADD CONSTRAINT "quote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote" ADD CONSTRAINT "quote_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote" ADD CONSTRAINT "quote_vehicleCategoryId_fkey" FOREIGN KEY ("vehicleCategoryId") REFERENCES "vehicle_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line" ADD CONSTRAINT "invoice_line_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "document_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_integration_settings" ADD CONSTRAINT "organization_integration_settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
