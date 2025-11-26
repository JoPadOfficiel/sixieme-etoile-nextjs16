-- CreateEnum
CREATE TYPE "PaymentTerms" AS ENUM ('IMMEDIATE', 'DAYS_15', 'DAYS_30', 'DAYS_45', 'DAYS_60');

-- CreateTable
CREATE TABLE "partner_contract" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "billingAddress" TEXT,
    "paymentTerms" "PaymentTerms" NOT NULL DEFAULT 'DAYS_30',
    "commissionPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_contract_zone_route" (
    "id" TEXT NOT NULL,
    "partnerContractId" TEXT NOT NULL,
    "zoneRouteId" TEXT NOT NULL,

    CONSTRAINT "partner_contract_zone_route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_contract_excursion_package" (
    "id" TEXT NOT NULL,
    "partnerContractId" TEXT NOT NULL,
    "excursionPackageId" TEXT NOT NULL,

    CONSTRAINT "partner_contract_excursion_package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_contract_dispo_package" (
    "id" TEXT NOT NULL,
    "partnerContractId" TEXT NOT NULL,
    "dispoPackageId" TEXT NOT NULL,

    CONSTRAINT "partner_contract_dispo_package_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partner_contract_contactId_key" ON "partner_contract"("contactId");

-- CreateIndex
CREATE INDEX "partner_contract_organizationId_idx" ON "partner_contract"("organizationId");

-- CreateIndex
CREATE INDEX "partner_contract_contactId_idx" ON "partner_contract"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "partner_contract_zone_route_partnerContractId_zoneRouteId_key" ON "partner_contract_zone_route"("partnerContractId", "zoneRouteId");

-- CreateIndex
CREATE UNIQUE INDEX "partner_contract_excursion_package_partnerContractId_excurs_key" ON "partner_contract_excursion_package"("partnerContractId", "excursionPackageId");

-- CreateIndex
CREATE UNIQUE INDEX "partner_contract_dispo_package_partnerContractId_dispoPacka_key" ON "partner_contract_dispo_package"("partnerContractId", "dispoPackageId");

-- AddForeignKey
ALTER TABLE "partner_contract" ADD CONSTRAINT "partner_contract_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_contract" ADD CONSTRAINT "partner_contract_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_contract_zone_route" ADD CONSTRAINT "partner_contract_zone_route_partnerContractId_fkey" FOREIGN KEY ("partnerContractId") REFERENCES "partner_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_contract_zone_route" ADD CONSTRAINT "partner_contract_zone_route_zoneRouteId_fkey" FOREIGN KEY ("zoneRouteId") REFERENCES "zone_route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_contract_excursion_package" ADD CONSTRAINT "partner_contract_excursion_package_partnerContractId_fkey" FOREIGN KEY ("partnerContractId") REFERENCES "partner_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_contract_excursion_package" ADD CONSTRAINT "partner_contract_excursion_package_excursionPackageId_fkey" FOREIGN KEY ("excursionPackageId") REFERENCES "excursion_package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_contract_dispo_package" ADD CONSTRAINT "partner_contract_dispo_package_partnerContractId_fkey" FOREIGN KEY ("partnerContractId") REFERENCES "partner_contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_contract_dispo_package" ADD CONSTRAINT "partner_contract_dispo_package_dispoPackageId_fkey" FOREIGN KEY ("dispoPackageId") REFERENCES "dispo_package"("id") ON DELETE CASCADE ON UPDATE CASCADE;
