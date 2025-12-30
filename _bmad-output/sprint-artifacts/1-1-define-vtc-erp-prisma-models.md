# Story 1.1: Define VTC ERP Prisma Models

Status: review

## Story

As a backend engineer,
I want a coherent set of Prisma models for contacts, fleet, pricing, quotes, invoices, fuel cache and settings,
so that the VTC ERP can store all required data with clear relationships and multi-tenancy.

## Acceptance Criteria

1. **Schema coverage** – `packages/database/prisma/schema.prisma` contains models for Contact, VehicleCategory, Vehicle, OperatingBase, Driver, DriverLicense, LicenseCategory, OrganizationLicenseRule, Quote, Invoice, InvoiceLine, PricingZone, ZoneRoute, ExcursionPackage, DispoPackage, OrganizationPricingSettings, AdvancedRate, SeasonalMultiplier, OptionalFee, Promotion, EmptyLegOpportunity, FuelPriceCache and OrganizationIntegrationSettings, following the field structure from `docs/bmad/tech-spec.md` §§2–7 and ensuring tenant isolation via `organizationId` (Tech Spec §§2–6, PRD FR17–FR60).
2. **Tooling succeeds** – Running `pnpm prisma format`, `pnpm prisma generate` and `pnpm prisma migrate dev --name add-vtc-erp-schema` completes without errors, generates the Prisma client, and leaves existing SaaS core tables unchanged (Tech Spec §5.5, PRD FR39–FR41).
3. **Migration integrity** – The initial migration introducing the VTC ERP schema applies cleanly on a clean database, creates all new tables, and does not drop/alter columns on the existing core models (`User`, `Session`, `Account`, `Verification`, `Passkey`, `Organization`, `Member`, `Invitation`, `Purchase`).

## Tasks / Subtasks

- [x] Define shared enums required by the VTC ERP models (ContactType, ClientType, QuoteStatus, InvoiceStatus, PricingMode, TripType, VehicleRegulatoryCategory, VehicleStatus, DriverEmploymentStatus, ZoneType, RouteDirection, AmountType, AdjustmentType, AdvancedRateAppliesTo, FuelType, InvoiceLineType) (AC1)
  - [x] Ensure enum names/values match domain vocabulary from Tech Spec §7.
- [x] Implement Core Tenancy & CRM models: Contact and Organization relation updates (AC1)
  - [x] Add `organizationId` FK, indices and relation fields; expose Contact↔Quote/Invoice relations.
- [x] Implement Fleet & RSE models: VehicleCategory, OperatingBase, Vehicle, LicenseCategory, OrganizationLicenseRule, Driver, DriverLicense (AC1)
  - [x] Include capacity, regulatory and cost fields with proper numeric types.
- [x] Implement Pricing & Zones models: PricingZone, ZoneRoute, ExcursionPackage, DispoPackage, OrganizationPricingSettings, AdvancedRate, SeasonalMultiplier, OptionalFee, Promotion, EmptyLegOpportunity (AC1)
  - [x] Model JSON fields (`geometry`, `tripAnalysis`, `appliedRules`, `autoApplyRules`, `pricingStrategy`) and relevant indices/uniques.
- [x] Implement Quotes, Invoices & Documents models: Quote, Invoice, InvoiceLine, DocumentType, Document (AC1, AC3)
  - [x] Ensure immutable invoice fields and Quote monetary fields (EUR-only) match PRD FR31–FR36.
- [x] Implement Fuel & Integrations models: FuelPriceCache, OrganizationIntegrationSettings (AC1)
  - [x] Enforce EUR currency convention and timestamping.
- [x] Add Organization relation fields for all new models plus minimal indices/constraints (AC1)
  - [x] Ensure multi-tenancy via `organizationId` + cascading behavior where appropriate.
- [x] Run Prisma tooling (`pnpm prisma format`, `pnpm prisma generate`) and fix any schema issues (AC2)
  - [x] Confirm generated Zod types update successfully.
- [x] Create and apply migration `pnpm prisma migrate dev --name add-vtc-erp-schema` (AC2, AC3)
  - [x] Inspect SQL to verify no changes to legacy SaaS tables and all VTC ERP tables present.
- [x] Document verification steps and update File List / Dev Agent Record upon completion (AC2, AC3)

## Dev Notes

- Follow Tech Spec §§2–7 for exact field lists, enums and relationships across CRM, Fleet, Pricing, Quotes/Invoices, Fuel & Integrations. Reuse existing naming/timestamp conventions from current Prisma schema. [Source: docs/bmad/tech-spec.md#2.-Core-Tenancy-&-CRM]
- Enforce zero hardcoding by persisting regulatory and pricing rules in configuration models (`OrganizationLicenseRule`, `OrganizationPricingSettings`, `AdvancedRate`, `SeasonalMultiplier`, `OptionalFee`, `Promotion`). [Source: docs/bmad/tech-spec.md#4.-Pricing-Zones-&-Grids]
- Monetary fields are EUR-only; represent amounts with `Decimal` and default `currency` = "EUR" where stored (PRD FR39, Tech Spec §4.5). [Source: docs/bmad/prd.md#Functional-Requirements]
- Date/time fields use Prisma `DateTime` without timezone annotations; values correspond directly to Europe/Paris business time (PRD FR40, Tech Spec §2.5).
- Maintain compatibility with existing SaaS core by avoiding modifications to User/Org-related models beyond adding relations; migrations must leave legacy tables intact. [Source: docs/bmad/tech-spec.md#Implementation-Details]
- Testing: rely on Prisma validation + migration checks; future stories will add application tests consuming the generated client. [Source: docs/bmad/tech-spec.md#Tests]

### Project Structure Notes

- Database schema lives in `packages/database/prisma/schema.prisma`; run Prisma CLI via workspace scripts defined at repo root (`pnpm prisma ...`).
- Generated clients/types output to `packages/database/src/zod`; ensure the generator block remains intact.
- Migrations stored under `packages/database/prisma/migrations`; name the first VTC ERP migration `add-vtc-erp-schema` per context plan.
- No changes required in `apps/web` or other packages for this story; focus remains on `packages/database` per Epic 1.

### References

- [Source: docs/bmad/epics.md#story-1.1]
- [Source: docs/bmad/prd.md#Functional-Requirements]
- [Source: docs/bmad/tech-spec.md#2.-Core-Tenancy-&-CRM]
- [Source: docs/bmad/ux-design-specification.md#8.-Screen-Specifications]

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/1-1-define-vtc-erp-prisma-models.context.xml

### Agent Model Used

Cascade BMAD Dev Agent (ChatGPT)

### Debug Log References

- 2025-11-25: `prisma format` succeeded (exit 0)
- 2025-11-25: `prisma generate` succeeded (exit 0) - Prisma Client + Zod types generated
- 2025-11-25: `prisma migrate dev` succeeded - migration `20251125184455_add_vtc_erp_schema` applied

### Completion Notes List

- Added 16 VTC ERP enums matching Tech Spec §7 domain vocabulary
- Added 22 VTC ERP models with full field definitions per Tech Spec §§2-6
- All models with tenant data include `organizationId` FK with cascade delete
- Organization model extended with 22 new relation fields
- Decimal types used for all monetary fields (EUR-only convention)
- Json fields for flexible structures: `geometry`, `tripAnalysis`, `appliedRules`, `autoApplyRules`, `pricingStrategy`
- Indices added on `organizationId`, status fields, and common query patterns
- Unique constraints on: `[organizationId, code]` for categories/zones, `[organizationId, registrationNumber]` for vehicles, `[organizationId, number]` for invoices, `[organizationId, code]` for promotions
- Migration `20251125184455_add_vtc_erp_schema` applied successfully (1000 lines SQL)
- All 22 VTC ERP tables created with proper indices and foreign keys
- Core SaaS tables unchanged (user, session, account, verification, passkey, organization, member, invitation, Purchase)

### File List

- MODIFIED: `packages/database/prisma/schema.prisma` - Added VTC ERP enums and models (lines 161-1177)
- REGENERATED: `packages/database/src/zod/index.ts` - Zod types for all new models and enums
- NEW: `packages/database/prisma/migrations/20251125184455_add_vtc_erp_schema/migration.sql` - Initial VTC ERP migration
