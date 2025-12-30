import { z } from 'zod';
import { Prisma } from '@prisma/client';
import Decimal from 'decimal.js';

/////////////////////////////////////////
// HELPER FUNCTIONS
/////////////////////////////////////////

// JSON
//------------------------------------------------------

export type NullableJsonInput = Prisma.JsonValue | null | 'JsonNull' | 'DbNull' | Prisma.NullTypes.DbNull | Prisma.NullTypes.JsonNull;

export const transformJsonNull = (v?: NullableJsonInput) => {
  if (!v || v === 'DbNull') return Prisma.DbNull;
  if (v === 'JsonNull') return Prisma.JsonNull;
  return v;
};

export const JsonValueSchema: z.ZodType<Prisma.JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.literal(null),
    z.record(z.lazy(() => JsonValueSchema.optional())),
    z.array(z.lazy(() => JsonValueSchema)),
  ])
);

export type JsonValueType = z.infer<typeof JsonValueSchema>;

export const NullableJsonValue = z
  .union([JsonValueSchema, z.literal('DbNull'), z.literal('JsonNull')])
  .nullable()
  .transform((v) => transformJsonNull(v));

export type NullableJsonValueType = z.infer<typeof NullableJsonValue>;

export const InputJsonValueSchema: z.ZodType<Prisma.InputJsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.object({ toJSON: z.function(z.tuple([]), z.any()) }),
    z.record(z.lazy(() => z.union([InputJsonValueSchema, z.literal(null)]))),
    z.array(z.lazy(() => z.union([InputJsonValueSchema, z.literal(null)]))),
  ])
);

export type InputJsonValueType = z.infer<typeof InputJsonValueSchema>;

// DECIMAL
//------------------------------------------------------

export const DecimalJsLikeSchema: z.ZodType<Prisma.DecimalJsLike> = z.object({
  d: z.array(z.number()),
  e: z.number(),
  s: z.number(),
  toFixed: z.function(z.tuple([]), z.string()),
})

export const DECIMAL_STRING_REGEX = /^(?:-?Infinity|NaN|-?(?:0[bB][01]+(?:\.[01]+)?(?:[pP][-+]?\d+)?|0[oO][0-7]+(?:\.[0-7]+)?(?:[pP][-+]?\d+)?|0[xX][\da-fA-F]+(?:\.[\da-fA-F]+)?(?:[pP][-+]?\d+)?|(?:\d+|\d*\.\d+)(?:[eE][-+]?\d+)?))$/;

export const isValidDecimalInput =
  (v?: null | string | number | Prisma.DecimalJsLike): v is string | number | Prisma.DecimalJsLike => {
    if (v === undefined || v === null) return false;
    return (
      (typeof v === 'object' && 'd' in v && 'e' in v && 's' in v && 'toFixed' in v) ||
      (typeof v === 'string' && DECIMAL_STRING_REGEX.test(v)) ||
      typeof v === 'number'
    )
  };

/////////////////////////////////////////
// ENUMS
/////////////////////////////////////////

export const TransactionIsolationLevelSchema = z.enum(['ReadUncommitted','ReadCommitted','RepeatableRead','Serializable']);

export const UserScalarFieldEnumSchema = z.enum(['id','name','email','emailVerified','image','createdAt','updatedAt','username','role','banned','banReason','banExpires','onboardingComplete','locale']);

export const SessionScalarFieldEnumSchema = z.enum(['id','expiresAt','ipAddress','userAgent','userId','impersonatedBy','activeOrganizationId','token','createdAt','updatedAt']);

export const AccountScalarFieldEnumSchema = z.enum(['id','accountId','providerId','userId','accessToken','refreshToken','idToken','expiresAt','password','accessTokenExpiresAt','refreshTokenExpiresAt','scope','createdAt','updatedAt']);

export const VerificationScalarFieldEnumSchema = z.enum(['id','identifier','value','expiresAt','createdAt','updatedAt']);

export const PasskeyScalarFieldEnumSchema = z.enum(['id','name','publicKey','userId','webauthnUserID','counter','deviceType','backedUp','transports','createdAt']);

export const OrganizationScalarFieldEnumSchema = z.enum(['id','name','slug','logo','createdAt','metadata']);

export const MemberScalarFieldEnumSchema = z.enum(['id','organizationId','userId','role','createdAt']);

export const InvitationScalarFieldEnumSchema = z.enum(['id','organizationId','email','role','status','expiresAt','inviterId']);

export const PurchaseScalarFieldEnumSchema = z.enum(['id','organizationId','userId','type','customerId','subscriptionId','productId','status','createdAt','updatedAt']);

export const ContactScalarFieldEnumSchema = z.enum(['id','organizationId','type','displayName','firstName','lastName','email','phone','companyName','vatNumber','siret','billingAddress','isPartner','isSubcontractor','defaultClientType','notes','createdAt','updatedAt']);

export const PartnerContractScalarFieldEnumSchema = z.enum(['id','organizationId','contactId','billingAddress','paymentTerms','commissionPercent','notes','createdAt','updatedAt']);

export const PartnerContractZoneRouteScalarFieldEnumSchema = z.enum(['id','partnerContractId','zoneRouteId','overridePrice']);

export const PartnerContractExcursionPackageScalarFieldEnumSchema = z.enum(['id','partnerContractId','excursionPackageId','overridePrice']);

export const PartnerContractDispoPackageScalarFieldEnumSchema = z.enum(['id','partnerContractId','dispoPackageId','overridePrice']);

export const SubcontractorProfileScalarFieldEnumSchema = z.enum(['id','organizationId','contactId','ratePerKm','ratePerHour','minimumFare','isActive','notes','createdAt','updatedAt']);

export const SubcontractorZoneScalarFieldEnumSchema = z.enum(['id','subcontractorProfileId','pricingZoneId']);

export const SubcontractorVehicleCategoryScalarFieldEnumSchema = z.enum(['id','subcontractorProfileId','vehicleCategoryId']);

export const VehicleCategoryScalarFieldEnumSchema = z.enum(['id','organizationId','name','code','regulatoryCategory','maxPassengers','maxLuggageVolume','priceMultiplier','defaultRatePerKm','defaultRatePerHour','averageConsumptionL100km','description','isActive','createdAt','updatedAt']);

export const OperatingBaseScalarFieldEnumSchema = z.enum(['id','organizationId','name','addressLine1','addressLine2','city','postalCode','countryCode','latitude','longitude','isActive','createdAt','updatedAt']);

export const VehicleScalarFieldEnumSchema = z.enum(['id','organizationId','vehicleCategoryId','operatingBaseId','registrationNumber','internalName','vin','passengerCapacity','luggageCapacity','consumptionLPer100Km','averageSpeedKmh','costPerKm','requiredLicenseCategoryId','status','notes','createdAt','updatedAt']);

export const LicenseCategoryScalarFieldEnumSchema = z.enum(['id','organizationId','code','name','description','createdAt','updatedAt']);

export const OrganizationLicenseRuleScalarFieldEnumSchema = z.enum(['id','organizationId','licenseCategoryId','maxDailyDrivingHours','maxDailyAmplitudeHours','breakMinutesPerDrivingBlock','drivingBlockHoursForBreak','cappedAverageSpeedKmh','createdAt','updatedAt']);

export const DriverScalarFieldEnumSchema = z.enum(['id','organizationId','firstName','lastName','email','phone','employmentStatus','hourlyCost','isActive','notes','createdAt','updatedAt']);

export const DriverLicenseScalarFieldEnumSchema = z.enum(['id','driverId','licenseCategoryId','licenseNumber','validFrom','validTo','createdAt','updatedAt']);

export const PricingZoneScalarFieldEnumSchema = z.enum(['id','organizationId','name','code','zoneType','geometry','centerLatitude','centerLongitude','radiusKm','parentZoneId','color','postalCodes','creationMethod','priceMultiplier','multiplierDescription','priority','isActive','createdAt','updatedAt']);

export const ZoneRouteScalarFieldEnumSchema = z.enum(['id','organizationId','originType','originPlaceId','originAddress','originLat','originLng','destinationType','destPlaceId','destAddress','destLat','destLng','fromZoneId','toZoneId','vehicleCategoryId','direction','fixedPrice','isActive','createdAt','updatedAt']);

export const ZoneRouteOriginZoneScalarFieldEnumSchema = z.enum(['id','zoneRouteId','zoneId','pricingZoneId']);

export const ZoneRouteDestinationZoneScalarFieldEnumSchema = z.enum(['id','zoneRouteId','zoneId','pricingZoneId']);

export const ExcursionPackageScalarFieldEnumSchema = z.enum(['id','organizationId','name','description','originZoneId','destinationZoneId','vehicleCategoryId','includedDurationHours','includedDistanceKm','price','isActive','createdAt','updatedAt']);

export const DispoPackageScalarFieldEnumSchema = z.enum(['id','organizationId','name','description','vehicleCategoryId','includedDurationHours','includedDistanceKm','basePrice','overageRatePerKm','overageRatePerHour','isActive','createdAt','updatedAt']);

export const OrganizationPricingSettingsScalarFieldEnumSchema = z.enum(['id','organizationId','baseRatePerKm','baseRatePerHour','defaultMarginPercent','greenMarginThreshold','orangeMarginThreshold','minimumFare','roundingRule','fuelConsumptionL100km','fuelPricePerLiter','tollCostPerKm','wearCostPerKm','driverHourlyCost','zoneConflictStrategy','createdAt','updatedAt']);

export const AdvancedRateScalarFieldEnumSchema = z.enum(['id','organizationId','name','appliesTo','startTime','endTime','daysOfWeek','minDistanceKm','maxDistanceKm','zoneId','adjustmentType','value','priority','isActive','createdAt','updatedAt']);

export const SeasonalMultiplierScalarFieldEnumSchema = z.enum(['id','organizationId','name','description','startDate','endDate','multiplier','priority','isActive','createdAt','updatedAt']);

export const OptionalFeeScalarFieldEnumSchema = z.enum(['id','organizationId','name','description','amountType','amount','isTaxable','vatRate','autoApplyRules','isActive','createdAt','updatedAt']);

export const PromotionScalarFieldEnumSchema = z.enum(['id','organizationId','code','description','discountType','value','validFrom','validTo','maxTotalUses','maxUsesPerContact','currentUses','isActive','createdAt','updatedAt']);

export const EmptyLegOpportunityScalarFieldEnumSchema = z.enum(['id','organizationId','vehicleId','fromZoneId','toZoneId','fromAddress','fromLatitude','fromLongitude','toAddress','toLatitude','toLongitude','estimatedDistanceKm','estimatedDurationMins','windowStart','windowEnd','pricingStrategy','sourceMissionId','isActive','notes','createdAt','updatedAt']);

export const QuoteScalarFieldEnumSchema = z.enum(['id','organizationId','contactId','status','pricingMode','tripType','pickupAt','pickupAddress','pickupLatitude','pickupLongitude','dropoffAddress','dropoffLatitude','dropoffLongitude','isRoundTrip','stops','returnDate','durationHours','maxKilometers','passengerCount','luggageCount','vehicleCategoryId','suggestedPrice','finalPrice','internalCost','marginPercent','commissionPercent','commissionAmount','tripAnalysis','appliedRules','costBreakdown','validUntil','notes','sentAt','viewedAt','acceptedAt','rejectedAt','expiredAt','assignedVehicleId','assignedDriverId','assignedAt','chainId','chainOrder','chainedWithId','isSubcontracted','subcontractorId','subcontractedPrice','subcontractedAt','subcontractingNotes','createdAt','updatedAt','vehicleId','driverId']);

export const InvoiceScalarFieldEnumSchema = z.enum(['id','organizationId','quoteId','contactId','number','status','issueDate','dueDate','totalExclVat','totalVat','totalInclVat','currency','commissionAmount','costBreakdown','notes','createdAt','updatedAt']);

export const InvoiceLineScalarFieldEnumSchema = z.enum(['id','invoiceId','lineType','description','quantity','unitPriceExclVat','vatRate','totalExclVat','totalVat','sortOrder','createdAt','updatedAt']);

export const DocumentTypeScalarFieldEnumSchema = z.enum(['id','code','name','description']);

export const DocumentScalarFieldEnumSchema = z.enum(['id','organizationId','documentTypeId','quoteId','invoiceId','storagePath','url','filename','createdAt']);

export const FuelPriceCacheScalarFieldEnumSchema = z.enum(['id','countryCode','latitude','longitude','fuelType','pricePerLitre','currency','source','fetchedAt']);

export const OrganizationIntegrationSettingsScalarFieldEnumSchema = z.enum(['id','organizationId','googleMapsApiKey','collectApiKey','preferredFuelType','googleMapsStatus','googleMapsTestedAt','collectApiStatus','collectApiTestedAt','createdAt','updatedAt']);

export const DriverRSECounterScalarFieldEnumSchema = z.enum(['id','organizationId','driverId','date','regulatoryCategory','licenseCategoryId','drivingMinutes','amplitudeMinutes','breakMinutes','restMinutes','workStartTime','workEndTime','createdAt','updatedAt']);

export const ComplianceAuditLogScalarFieldEnumSchema = z.enum(['id','organizationId','driverId','timestamp','quoteId','missionId','vehicleCategoryId','regulatoryCategory','decision','violations','warnings','reason','countersSnapshot']);

export const QuoteStatusAuditLogScalarFieldEnumSchema = z.enum(['id','organizationId','quoteId','previousStatus','newStatus','userId','timestamp','reason']);

export const TollCacheScalarFieldEnumSchema = z.enum(['id','originHash','destinationHash','tollAmount','currency','source','fetchedAt','expiresAt']);

export const SortOrderSchema = z.enum(['asc','desc']);

export const NullableJsonNullValueInputSchema = z.enum(['DbNull','JsonNull',]).transform((value) => value === 'JsonNull' ? Prisma.JsonNull : value === 'DbNull' ? Prisma.DbNull : value);

export const QueryModeSchema = z.enum(['default','insensitive']);

export const NullsOrderSchema = z.enum(['first','last']);

export const JsonNullValueFilterSchema = z.enum(['DbNull','JsonNull','AnyNull',]).transform((value) => value === 'JsonNull' ? Prisma.JsonNull : value === 'DbNull' ? Prisma.JsonNull : value === 'AnyNull' ? Prisma.AnyNull : value);

export const PurchaseTypeSchema = z.enum(['SUBSCRIPTION','ONE_TIME']);

export type PurchaseTypeType = `${z.infer<typeof PurchaseTypeSchema>}`

export const ContactTypeSchema = z.enum(['INDIVIDUAL','BUSINESS','AGENCY']);

export type ContactTypeType = `${z.infer<typeof ContactTypeSchema>}`

export const ClientTypeSchema = z.enum(['PARTNER','PRIVATE']);

export type ClientTypeType = `${z.infer<typeof ClientTypeSchema>}`

export const VehicleRegulatoryCategorySchema = z.enum(['LIGHT','HEAVY']);

export type VehicleRegulatoryCategoryType = `${z.infer<typeof VehicleRegulatoryCategorySchema>}`

export const VehicleStatusSchema = z.enum(['ACTIVE','MAINTENANCE','OUT_OF_SERVICE']);

export type VehicleStatusType = `${z.infer<typeof VehicleStatusSchema>}`

export const DriverEmploymentStatusSchema = z.enum(['EMPLOYEE','CONTRACTOR','FREELANCE']);

export type DriverEmploymentStatusType = `${z.infer<typeof DriverEmploymentStatusSchema>}`

export const QuoteStatusSchema = z.enum(['DRAFT','SENT','VIEWED','ACCEPTED','REJECTED','EXPIRED']);

export type QuoteStatusType = `${z.infer<typeof QuoteStatusSchema>}`

export const InvoiceStatusSchema = z.enum(['DRAFT','ISSUED','PAID','CANCELLED']);

export type InvoiceStatusType = `${z.infer<typeof InvoiceStatusSchema>}`

export const PricingModeSchema = z.enum(['FIXED_GRID','DYNAMIC']);

export type PricingModeType = `${z.infer<typeof PricingModeSchema>}`

export const TripTypeSchema = z.enum(['TRANSFER','EXCURSION','DISPO','OFF_GRID']);

export type TripTypeType = `${z.infer<typeof TripTypeSchema>}`

export const AmountTypeSchema = z.enum(['FIXED','PERCENTAGE']);

export type AmountTypeType = `${z.infer<typeof AmountTypeSchema>}`

export const AdjustmentTypeSchema = z.enum(['PERCENTAGE','FIXED_AMOUNT']);

export type AdjustmentTypeType = `${z.infer<typeof AdjustmentTypeSchema>}`

export const ZoneTypeSchema = z.enum(['POLYGON','RADIUS','POINT']);

export type ZoneTypeType = `${z.infer<typeof ZoneTypeSchema>}`

export const ZoneConflictStrategySchema = z.enum(['PRIORITY','MOST_EXPENSIVE','CLOSEST','COMBINED']);

export type ZoneConflictStrategyType = `${z.infer<typeof ZoneConflictStrategySchema>}`

export const RouteDirectionSchema = z.enum(['BIDIRECTIONAL','A_TO_B','B_TO_A']);

export type RouteDirectionType = `${z.infer<typeof RouteDirectionSchema>}`

export const AdvancedRateAppliesToSchema = z.enum(['NIGHT','WEEKEND']);

export type AdvancedRateAppliesToType = `${z.infer<typeof AdvancedRateAppliesToSchema>}`

export const FuelTypeSchema = z.enum(['GASOLINE','DIESEL','LPG']);

export type FuelTypeType = `${z.infer<typeof FuelTypeSchema>}`

export const InvoiceLineTypeSchema = z.enum(['SERVICE','OPTIONAL_FEE','PROMOTION_ADJUSTMENT','OTHER']);

export type InvoiceLineTypeType = `${z.infer<typeof InvoiceLineTypeSchema>}`

export const PaymentTermsSchema = z.enum(['IMMEDIATE','DAYS_15','DAYS_30','DAYS_45','DAYS_60']);

export type PaymentTermsType = `${z.infer<typeof PaymentTermsSchema>}`

export const OriginDestinationTypeSchema = z.enum(['ZONES','ADDRESS']);

export type OriginDestinationTypeType = `${z.infer<typeof OriginDestinationTypeSchema>}`

/////////////////////////////////////////
// MODELS
/////////////////////////////////////////

/////////////////////////////////////////
// USER SCHEMA
/////////////////////////////////////////

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  username: z.string().nullable(),
  role: z.string().nullable(),
  banned: z.boolean().nullable(),
  banReason: z.string().nullable(),
  banExpires: z.coerce.date().nullable(),
  onboardingComplete: z.boolean(),
  locale: z.string().nullable(),
})

export type User = z.infer<typeof UserSchema>

/////////////////////////////////////////
// SESSION SCHEMA
/////////////////////////////////////////

export const SessionSchema = z.object({
  id: z.string(),
  expiresAt: z.coerce.date(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  userId: z.string(),
  impersonatedBy: z.string().nullable(),
  activeOrganizationId: z.string().nullable(),
  token: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Session = z.infer<typeof SessionSchema>

/////////////////////////////////////////
// ACCOUNT SCHEMA
/////////////////////////////////////////

export const AccountSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  providerId: z.string(),
  userId: z.string(),
  accessToken: z.string().nullable(),
  refreshToken: z.string().nullable(),
  idToken: z.string().nullable(),
  expiresAt: z.coerce.date().nullable(),
  password: z.string().nullable(),
  accessTokenExpiresAt: z.coerce.date().nullable(),
  refreshTokenExpiresAt: z.coerce.date().nullable(),
  scope: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Account = z.infer<typeof AccountSchema>

/////////////////////////////////////////
// VERIFICATION SCHEMA
/////////////////////////////////////////

export const VerificationSchema = z.object({
  id: z.string(),
  identifier: z.string(),
  value: z.string(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
})

export type Verification = z.infer<typeof VerificationSchema>

/////////////////////////////////////////
// PASSKEY SCHEMA
/////////////////////////////////////////

export const PasskeySchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  publicKey: z.string(),
  userId: z.string(),
  webauthnUserID: z.string(),
  counter: z.number().int(),
  deviceType: z.string(),
  backedUp: z.boolean(),
  transports: z.string().nullable(),
  createdAt: z.coerce.date().nullable(),
})

export type Passkey = z.infer<typeof PasskeySchema>

/////////////////////////////////////////
// ORGANIZATION SCHEMA
/////////////////////////////////////////

export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string().nullable(),
  logo: z.string().nullable(),
  createdAt: z.coerce.date(),
  metadata: z.string().nullable(),
})

export type Organization = z.infer<typeof OrganizationSchema>

/////////////////////////////////////////
// MEMBER SCHEMA
/////////////////////////////////////////

export const MemberSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  role: z.string(),
  createdAt: z.coerce.date(),
})

export type Member = z.infer<typeof MemberSchema>

/////////////////////////////////////////
// INVITATION SCHEMA
/////////////////////////////////////////

export const InvitationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  email: z.string(),
  role: z.string().nullable(),
  status: z.string(),
  expiresAt: z.coerce.date(),
  inviterId: z.string(),
})

export type Invitation = z.infer<typeof InvitationSchema>

/////////////////////////////////////////
// PURCHASE SCHEMA
/////////////////////////////////////////

export const PurchaseSchema = z.object({
  type: PurchaseTypeSchema,
  id: z.string().cuid(),
  organizationId: z.string().nullable(),
  userId: z.string().nullable(),
  customerId: z.string(),
  subscriptionId: z.string().nullable(),
  productId: z.string(),
  status: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Purchase = z.infer<typeof PurchaseSchema>

/////////////////////////////////////////
// CONTACT SCHEMA
/////////////////////////////////////////

/**
 * Contact - Unifies private customers, corporate clients, and agencies
 */
export const ContactSchema = z.object({
  type: ContactTypeSchema,
  defaultClientType: ClientTypeSchema,
  id: z.string().cuid(),
  organizationId: z.string(),
  displayName: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  companyName: z.string().nullable(),
  vatNumber: z.string().nullable(),
  siret: z.string().nullable(),
  billingAddress: z.string().nullable(),
  isPartner: z.boolean(),
  isSubcontractor: z.boolean(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Contact = z.infer<typeof ContactSchema>

/////////////////////////////////////////
// PARTNER CONTRACT SCHEMA
/////////////////////////////////////////

/**
 * PartnerContract - Commercial settings for partner contacts
 */
export const PartnerContractSchema = z.object({
  paymentTerms: PaymentTermsSchema,
  id: z.string().cuid(),
  organizationId: z.string(),
  contactId: z.string(),
  billingAddress: z.string().nullable(),
  commissionPercent: z.instanceof(Prisma.Decimal, { message: "Field 'commissionPercent' must be a Decimal. Location: ['Models', 'PartnerContract']"}),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type PartnerContract = z.infer<typeof PartnerContractSchema>

/////////////////////////////////////////
// PARTNER CONTRACT ZONE ROUTE SCHEMA
/////////////////////////////////////////

/**
 * Junction table: PartnerContract <-> ZoneRoute
 * Story 12.1: Added overridePrice for partner-specific pricing
 */
export const PartnerContractZoneRouteSchema = z.object({
  id: z.string().cuid(),
  partnerContractId: z.string(),
  zoneRouteId: z.string(),
  overridePrice: z.instanceof(Prisma.Decimal, { message: "Field 'overridePrice' must be a Decimal. Location: ['Models', 'PartnerContractZoneRoute']"}).nullable(),
})

export type PartnerContractZoneRoute = z.infer<typeof PartnerContractZoneRouteSchema>

/////////////////////////////////////////
// PARTNER CONTRACT EXCURSION PACKAGE SCHEMA
/////////////////////////////////////////

/**
 * Junction table: PartnerContract <-> ExcursionPackage
 * Story 12.1: Added overridePrice for partner-specific pricing
 */
export const PartnerContractExcursionPackageSchema = z.object({
  id: z.string().cuid(),
  partnerContractId: z.string(),
  excursionPackageId: z.string(),
  overridePrice: z.instanceof(Prisma.Decimal, { message: "Field 'overridePrice' must be a Decimal. Location: ['Models', 'PartnerContractExcursionPackage']"}).nullable(),
})

export type PartnerContractExcursionPackage = z.infer<typeof PartnerContractExcursionPackageSchema>

/////////////////////////////////////////
// PARTNER CONTRACT DISPO PACKAGE SCHEMA
/////////////////////////////////////////

/**
 * Junction table: PartnerContract <-> DispoPackage
 * Story 12.1: Added overridePrice for partner-specific pricing
 */
export const PartnerContractDispoPackageSchema = z.object({
  id: z.string().cuid(),
  partnerContractId: z.string(),
  dispoPackageId: z.string(),
  overridePrice: z.instanceof(Prisma.Decimal, { message: "Field 'overridePrice' must be a Decimal. Location: ['Models', 'PartnerContractDispoPackage']"}).nullable(),
})

export type PartnerContractDispoPackage = z.infer<typeof PartnerContractDispoPackageSchema>

/////////////////////////////////////////
// SUBCONTRACTOR PROFILE SCHEMA
/////////////////////////////////////////

/**
 * SubcontractorProfile - Details for subcontractor contacts
 */
export const SubcontractorProfileSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  contactId: z.string(),
  ratePerKm: z.instanceof(Prisma.Decimal, { message: "Field 'ratePerKm' must be a Decimal. Location: ['Models', 'SubcontractorProfile']"}).nullable(),
  ratePerHour: z.instanceof(Prisma.Decimal, { message: "Field 'ratePerHour' must be a Decimal. Location: ['Models', 'SubcontractorProfile']"}).nullable(),
  minimumFare: z.instanceof(Prisma.Decimal, { message: "Field 'minimumFare' must be a Decimal. Location: ['Models', 'SubcontractorProfile']"}).nullable(),
  isActive: z.boolean(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type SubcontractorProfile = z.infer<typeof SubcontractorProfileSchema>

/////////////////////////////////////////
// SUBCONTRACTOR ZONE SCHEMA
/////////////////////////////////////////

/**
 * SubcontractorZone - Junction: SubcontractorProfile <-> PricingZone
 */
export const SubcontractorZoneSchema = z.object({
  id: z.string().cuid(),
  subcontractorProfileId: z.string(),
  pricingZoneId: z.string(),
})

export type SubcontractorZone = z.infer<typeof SubcontractorZoneSchema>

/////////////////////////////////////////
// SUBCONTRACTOR VEHICLE CATEGORY SCHEMA
/////////////////////////////////////////

/**
 * SubcontractorVehicleCategory - Junction: SubcontractorProfile <-> VehicleCategory
 */
export const SubcontractorVehicleCategorySchema = z.object({
  id: z.string().cuid(),
  subcontractorProfileId: z.string(),
  vehicleCategoryId: z.string(),
})

export type SubcontractorVehicleCategory = z.infer<typeof SubcontractorVehicleCategorySchema>

/////////////////////////////////////////
// VEHICLE CATEGORY SCHEMA
/////////////////////////////////////////

/**
 * VehicleCategory - Groups vehicles by commercial and regulatory category
 */
export const VehicleCategorySchema = z.object({
  regulatoryCategory: VehicleRegulatoryCategorySchema,
  id: z.string().cuid(),
  organizationId: z.string(),
  name: z.string(),
  code: z.string(),
  maxPassengers: z.number().int(),
  maxLuggageVolume: z.number().int().nullable(),
  priceMultiplier: z.instanceof(Prisma.Decimal, { message: "Field 'priceMultiplier' must be a Decimal. Location: ['Models', 'VehicleCategory']"}),
  defaultRatePerKm: z.instanceof(Prisma.Decimal, { message: "Field 'defaultRatePerKm' must be a Decimal. Location: ['Models', 'VehicleCategory']"}).nullable(),
  defaultRatePerHour: z.instanceof(Prisma.Decimal, { message: "Field 'defaultRatePerHour' must be a Decimal. Location: ['Models', 'VehicleCategory']"}).nullable(),
  averageConsumptionL100km: z.instanceof(Prisma.Decimal, { message: "Field 'averageConsumptionL100km' must be a Decimal. Location: ['Models', 'VehicleCategory']"}).nullable(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type VehicleCategory = z.infer<typeof VehicleCategorySchema>

/////////////////////////////////////////
// OPERATING BASE SCHEMA
/////////////////////////////////////////

/**
 * OperatingBase - Physical bases/garages for multi-base model
 */
export const OperatingBaseSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  name: z.string(),
  addressLine1: z.string(),
  addressLine2: z.string().nullable(),
  city: z.string(),
  postalCode: z.string(),
  countryCode: z.string(),
  latitude: z.instanceof(Prisma.Decimal, { message: "Field 'latitude' must be a Decimal. Location: ['Models', 'OperatingBase']"}),
  longitude: z.instanceof(Prisma.Decimal, { message: "Field 'longitude' must be a Decimal. Location: ['Models', 'OperatingBase']"}),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type OperatingBase = z.infer<typeof OperatingBaseSchema>

/////////////////////////////////////////
// VEHICLE SCHEMA
/////////////////////////////////////////

/**
 * Vehicle - Individual fleet vehicles
 */
export const VehicleSchema = z.object({
  status: VehicleStatusSchema,
  id: z.string().cuid(),
  organizationId: z.string(),
  vehicleCategoryId: z.string(),
  operatingBaseId: z.string(),
  registrationNumber: z.string(),
  internalName: z.string().nullable(),
  vin: z.string().nullable(),
  passengerCapacity: z.number().int(),
  luggageCapacity: z.number().int().nullable(),
  consumptionLPer100Km: z.instanceof(Prisma.Decimal, { message: "Field 'consumptionLPer100Km' must be a Decimal. Location: ['Models', 'Vehicle']"}).nullable(),
  averageSpeedKmh: z.number().int().nullable(),
  costPerKm: z.instanceof(Prisma.Decimal, { message: "Field 'costPerKm' must be a Decimal. Location: ['Models', 'Vehicle']"}).nullable(),
  requiredLicenseCategoryId: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Vehicle = z.infer<typeof VehicleSchema>

/////////////////////////////////////////
// LICENSE CATEGORY SCHEMA
/////////////////////////////////////////

/**
 * LicenseCategory - Encodes license types (B, D, D_CMI, etc.)
 */
export const LicenseCategorySchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type LicenseCategory = z.infer<typeof LicenseCategorySchema>

/////////////////////////////////////////
// ORGANIZATION LICENSE RULE SCHEMA
/////////////////////////////////////////

/**
 * OrganizationLicenseRule - RSE limits per license type (zero-hardcoding)
 */
export const OrganizationLicenseRuleSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  licenseCategoryId: z.string(),
  maxDailyDrivingHours: z.instanceof(Prisma.Decimal, { message: "Field 'maxDailyDrivingHours' must be a Decimal. Location: ['Models', 'OrganizationLicenseRule']"}),
  maxDailyAmplitudeHours: z.instanceof(Prisma.Decimal, { message: "Field 'maxDailyAmplitudeHours' must be a Decimal. Location: ['Models', 'OrganizationLicenseRule']"}),
  breakMinutesPerDrivingBlock: z.number().int(),
  drivingBlockHoursForBreak: z.instanceof(Prisma.Decimal, { message: "Field 'drivingBlockHoursForBreak' must be a Decimal. Location: ['Models', 'OrganizationLicenseRule']"}),
  cappedAverageSpeedKmh: z.number().int().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type OrganizationLicenseRule = z.infer<typeof OrganizationLicenseRuleSchema>

/////////////////////////////////////////
// DRIVER SCHEMA
/////////////////////////////////////////

/**
 * Driver - Driver profiles with cost information
 */
export const DriverSchema = z.object({
  employmentStatus: DriverEmploymentStatusSchema,
  id: z.string().cuid(),
  organizationId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  hourlyCost: z.instanceof(Prisma.Decimal, { message: "Field 'hourlyCost' must be a Decimal. Location: ['Models', 'Driver']"}).nullable(),
  isActive: z.boolean(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Driver = z.infer<typeof DriverSchema>

/////////////////////////////////////////
// DRIVER LICENSE SCHEMA
/////////////////////////////////////////

/**
 * DriverLicense - Junction between Driver and LicenseCategory
 */
export const DriverLicenseSchema = z.object({
  id: z.string().cuid(),
  driverId: z.string(),
  licenseCategoryId: z.string(),
  licenseNumber: z.string(),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type DriverLicense = z.infer<typeof DriverLicenseSchema>

/////////////////////////////////////////
// PRICING ZONE SCHEMA
/////////////////////////////////////////

/**
 * PricingZone - Geographic zones (central Paris, rings, satellites)
 */
export const PricingZoneSchema = z.object({
  zoneType: ZoneTypeSchema,
  id: z.string().cuid(),
  organizationId: z.string(),
  name: z.string(),
  code: z.string(),
  geometry: JsonValueSchema.nullable(),
  centerLatitude: z.instanceof(Prisma.Decimal, { message: "Field 'centerLatitude' must be a Decimal. Location: ['Models', 'PricingZone']"}).nullable(),
  centerLongitude: z.instanceof(Prisma.Decimal, { message: "Field 'centerLongitude' must be a Decimal. Location: ['Models', 'PricingZone']"}).nullable(),
  radiusKm: z.instanceof(Prisma.Decimal, { message: "Field 'radiusKm' must be a Decimal. Location: ['Models', 'PricingZone']"}).nullable(),
  parentZoneId: z.string().nullable(),
  color: z.string().nullable(),
  postalCodes: z.string().array(),
  creationMethod: z.string().nullable(),
  priceMultiplier: z.instanceof(Prisma.Decimal, { message: "Field 'priceMultiplier' must be a Decimal. Location: ['Models', 'PricingZone']"}),
  multiplierDescription: z.string().nullable(),
  priority: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type PricingZone = z.infer<typeof PricingZoneSchema>

/////////////////////////////////////////
// ZONE ROUTE SCHEMA
/////////////////////////////////////////

/**
 * ZoneRoute - Method 1 zone-to-zone fixed pricing for transfers
 * Extended in Story 14.2 to support multi-zone and address-based origins/destinations
 */
export const ZoneRouteSchema = z.object({
  originType: OriginDestinationTypeSchema,
  destinationType: OriginDestinationTypeSchema,
  direction: RouteDirectionSchema,
  id: z.string().cuid(),
  organizationId: z.string(),
  originPlaceId: z.string().nullable(),
  originAddress: z.string().nullable(),
  originLat: z.number().nullable(),
  originLng: z.number().nullable(),
  destPlaceId: z.string().nullable(),
  destAddress: z.string().nullable(),
  destLat: z.number().nullable(),
  destLng: z.number().nullable(),
  fromZoneId: z.string().nullable(),
  toZoneId: z.string().nullable(),
  vehicleCategoryId: z.string(),
  fixedPrice: z.instanceof(Prisma.Decimal, { message: "Field 'fixedPrice' must be a Decimal. Location: ['Models', 'ZoneRoute']"}),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type ZoneRoute = z.infer<typeof ZoneRouteSchema>

/////////////////////////////////////////
// ZONE ROUTE ORIGIN ZONE SCHEMA
/////////////////////////////////////////

/**
 * Junction table for multi-zone origins (Story 14.2)
 */
export const ZoneRouteOriginZoneSchema = z.object({
  id: z.string().cuid(),
  zoneRouteId: z.string(),
  zoneId: z.string(),
  pricingZoneId: z.string().nullable(),
})

export type ZoneRouteOriginZone = z.infer<typeof ZoneRouteOriginZoneSchema>

/////////////////////////////////////////
// ZONE ROUTE DESTINATION ZONE SCHEMA
/////////////////////////////////////////

/**
 * Junction table for multi-zone destinations (Story 14.2)
 */
export const ZoneRouteDestinationZoneSchema = z.object({
  id: z.string().cuid(),
  zoneRouteId: z.string(),
  zoneId: z.string(),
  pricingZoneId: z.string().nullable(),
})

export type ZoneRouteDestinationZone = z.infer<typeof ZoneRouteDestinationZoneSchema>

/////////////////////////////////////////
// EXCURSION PACKAGE SCHEMA
/////////////////////////////////////////

/**
 * ExcursionPackage - Forfaits for excursions (Normandy, Loire Valley, etc.)
 */
export const ExcursionPackageSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  originZoneId: z.string().nullable(),
  destinationZoneId: z.string().nullable(),
  vehicleCategoryId: z.string(),
  includedDurationHours: z.instanceof(Prisma.Decimal, { message: "Field 'includedDurationHours' must be a Decimal. Location: ['Models', 'ExcursionPackage']"}),
  includedDistanceKm: z.instanceof(Prisma.Decimal, { message: "Field 'includedDistanceKm' must be a Decimal. Location: ['Models', 'ExcursionPackage']"}),
  price: z.instanceof(Prisma.Decimal, { message: "Field 'price' must be a Decimal. Location: ['Models', 'ExcursionPackage']"}),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type ExcursionPackage = z.infer<typeof ExcursionPackageSchema>

/////////////////////////////////////////
// DISPO PACKAGE SCHEMA
/////////////////////////////////////////

/**
 * DispoPackage - Forfaits de mise à disposition (hourly dispos)
 */
export const DispoPackageSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  vehicleCategoryId: z.string(),
  includedDurationHours: z.instanceof(Prisma.Decimal, { message: "Field 'includedDurationHours' must be a Decimal. Location: ['Models', 'DispoPackage']"}),
  includedDistanceKm: z.instanceof(Prisma.Decimal, { message: "Field 'includedDistanceKm' must be a Decimal. Location: ['Models', 'DispoPackage']"}),
  basePrice: z.instanceof(Prisma.Decimal, { message: "Field 'basePrice' must be a Decimal. Location: ['Models', 'DispoPackage']"}),
  overageRatePerKm: z.instanceof(Prisma.Decimal, { message: "Field 'overageRatePerKm' must be a Decimal. Location: ['Models', 'DispoPackage']"}),
  overageRatePerHour: z.instanceof(Prisma.Decimal, { message: "Field 'overageRatePerHour' must be a Decimal. Location: ['Models', 'DispoPackage']"}),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type DispoPackage = z.infer<typeof DispoPackageSchema>

/////////////////////////////////////////
// ORGANIZATION PRICING SETTINGS SCHEMA
/////////////////////////////////////////

/**
 * OrganizationPricingSettings - Base commercial parameters per organisation
 */
export const OrganizationPricingSettingsSchema = z.object({
  zoneConflictStrategy: ZoneConflictStrategySchema.nullable(),
  id: z.string().cuid(),
  organizationId: z.string(),
  baseRatePerKm: z.instanceof(Prisma.Decimal, { message: "Field 'baseRatePerKm' must be a Decimal. Location: ['Models', 'OrganizationPricingSettings']"}),
  baseRatePerHour: z.instanceof(Prisma.Decimal, { message: "Field 'baseRatePerHour' must be a Decimal. Location: ['Models', 'OrganizationPricingSettings']"}),
  defaultMarginPercent: z.instanceof(Prisma.Decimal, { message: "Field 'defaultMarginPercent' must be a Decimal. Location: ['Models', 'OrganizationPricingSettings']"}),
  greenMarginThreshold: z.instanceof(Prisma.Decimal, { message: "Field 'greenMarginThreshold' must be a Decimal. Location: ['Models', 'OrganizationPricingSettings']"}),
  orangeMarginThreshold: z.instanceof(Prisma.Decimal, { message: "Field 'orangeMarginThreshold' must be a Decimal. Location: ['Models', 'OrganizationPricingSettings']"}),
  minimumFare: z.instanceof(Prisma.Decimal, { message: "Field 'minimumFare' must be a Decimal. Location: ['Models', 'OrganizationPricingSettings']"}),
  roundingRule: z.string().nullable(),
  fuelConsumptionL100km: z.instanceof(Prisma.Decimal, { message: "Field 'fuelConsumptionL100km' must be a Decimal. Location: ['Models', 'OrganizationPricingSettings']"}).nullable(),
  fuelPricePerLiter: z.instanceof(Prisma.Decimal, { message: "Field 'fuelPricePerLiter' must be a Decimal. Location: ['Models', 'OrganizationPricingSettings']"}).nullable(),
  tollCostPerKm: z.instanceof(Prisma.Decimal, { message: "Field 'tollCostPerKm' must be a Decimal. Location: ['Models', 'OrganizationPricingSettings']"}).nullable(),
  wearCostPerKm: z.instanceof(Prisma.Decimal, { message: "Field 'wearCostPerKm' must be a Decimal. Location: ['Models', 'OrganizationPricingSettings']"}).nullable(),
  driverHourlyCost: z.instanceof(Prisma.Decimal, { message: "Field 'driverHourlyCost' must be a Decimal. Location: ['Models', 'OrganizationPricingSettings']"}).nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type OrganizationPricingSettings = z.infer<typeof OrganizationPricingSettingsSchema>

/////////////////////////////////////////
// ADVANCED RATE SCHEMA
/////////////////////////////////////////

/**
 * AdvancedRate - Advanced modifiers (night, weekend, long-distance, zone-based)
 */
export const AdvancedRateSchema = z.object({
  appliesTo: AdvancedRateAppliesToSchema,
  adjustmentType: AdjustmentTypeSchema,
  id: z.string().cuid(),
  organizationId: z.string(),
  name: z.string(),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  daysOfWeek: z.string().nullable(),
  minDistanceKm: z.instanceof(Prisma.Decimal, { message: "Field 'minDistanceKm' must be a Decimal. Location: ['Models', 'AdvancedRate']"}).nullable(),
  maxDistanceKm: z.instanceof(Prisma.Decimal, { message: "Field 'maxDistanceKm' must be a Decimal. Location: ['Models', 'AdvancedRate']"}).nullable(),
  zoneId: z.string().nullable(),
  value: z.instanceof(Prisma.Decimal, { message: "Field 'value' must be a Decimal. Location: ['Models', 'AdvancedRate']"}),
  priority: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type AdvancedRate = z.infer<typeof AdvancedRateSchema>

/////////////////////////////////////////
// SEASONAL MULTIPLIER SCHEMA
/////////////////////////////////////////

/**
 * SeasonalMultiplier - Seasonal or event-based multipliers
 */
export const SeasonalMultiplierSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  multiplier: z.instanceof(Prisma.Decimal, { message: "Field 'multiplier' must be a Decimal. Location: ['Models', 'SeasonalMultiplier']"}),
  priority: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type SeasonalMultiplier = z.infer<typeof SeasonalMultiplierSchema>

/////////////////////////////////////////
// OPTIONAL FEE SCHEMA
/////////////////////////////////////////

/**
 * OptionalFee - Catalogue of optional fees (baby seat, waiting, cleaning)
 */
export const OptionalFeeSchema = z.object({
  amountType: AmountTypeSchema,
  id: z.string().cuid(),
  organizationId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  amount: z.instanceof(Prisma.Decimal, { message: "Field 'amount' must be a Decimal. Location: ['Models', 'OptionalFee']"}),
  isTaxable: z.boolean(),
  vatRate: z.instanceof(Prisma.Decimal, { message: "Field 'vatRate' must be a Decimal. Location: ['Models', 'OptionalFee']"}),
  autoApplyRules: JsonValueSchema.nullable(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type OptionalFee = z.infer<typeof OptionalFeeSchema>

/////////////////////////////////////////
// PROMOTION SCHEMA
/////////////////////////////////////////

/**
 * Promotion - Promo codes and discounts
 */
export const PromotionSchema = z.object({
  discountType: AmountTypeSchema,
  id: z.string().cuid(),
  organizationId: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  value: z.instanceof(Prisma.Decimal, { message: "Field 'value' must be a Decimal. Location: ['Models', 'Promotion']"}),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date(),
  maxTotalUses: z.number().int().nullable(),
  maxUsesPerContact: z.number().int().nullable(),
  currentUses: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Promotion = z.infer<typeof PromotionSchema>

/////////////////////////////////////////
// EMPTY LEG OPPORTUNITY SCHEMA
/////////////////////////////////////////

/**
 * EmptyLegOpportunity - Empty-leg segments that can be sold with special strategies (Story 8.5)
 */
export const EmptyLegOpportunitySchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  vehicleId: z.string(),
  fromZoneId: z.string().nullable(),
  toZoneId: z.string().nullable(),
  fromAddress: z.string().nullable(),
  fromLatitude: z.instanceof(Prisma.Decimal, { message: "Field 'fromLatitude' must be a Decimal. Location: ['Models', 'EmptyLegOpportunity']"}).nullable(),
  fromLongitude: z.instanceof(Prisma.Decimal, { message: "Field 'fromLongitude' must be a Decimal. Location: ['Models', 'EmptyLegOpportunity']"}).nullable(),
  toAddress: z.string().nullable(),
  toLatitude: z.instanceof(Prisma.Decimal, { message: "Field 'toLatitude' must be a Decimal. Location: ['Models', 'EmptyLegOpportunity']"}).nullable(),
  toLongitude: z.instanceof(Prisma.Decimal, { message: "Field 'toLongitude' must be a Decimal. Location: ['Models', 'EmptyLegOpportunity']"}).nullable(),
  estimatedDistanceKm: z.instanceof(Prisma.Decimal, { message: "Field 'estimatedDistanceKm' must be a Decimal. Location: ['Models', 'EmptyLegOpportunity']"}).nullable(),
  estimatedDurationMins: z.number().int().nullable(),
  windowStart: z.coerce.date(),
  windowEnd: z.coerce.date(),
  pricingStrategy: JsonValueSchema.nullable(),
  sourceMissionId: z.string().nullable(),
  isActive: z.boolean(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type EmptyLegOpportunity = z.infer<typeof EmptyLegOpportunitySchema>

/////////////////////////////////////////
// QUOTE SCHEMA
/////////////////////////////////////////

/**
 * Quote - Central commercial object for pricing and feasibility
 */
export const QuoteSchema = z.object({
  status: QuoteStatusSchema,
  pricingMode: PricingModeSchema,
  tripType: TripTypeSchema,
  id: z.string().cuid(),
  organizationId: z.string(),
  contactId: z.string(),
  pickupAt: z.coerce.date(),
  pickupAddress: z.string(),
  pickupLatitude: z.instanceof(Prisma.Decimal, { message: "Field 'pickupLatitude' must be a Decimal. Location: ['Models', 'Quote']"}).nullable(),
  pickupLongitude: z.instanceof(Prisma.Decimal, { message: "Field 'pickupLongitude' must be a Decimal. Location: ['Models', 'Quote']"}).nullable(),
  dropoffAddress: z.string().nullable(),
  dropoffLatitude: z.instanceof(Prisma.Decimal, { message: "Field 'dropoffLatitude' must be a Decimal. Location: ['Models', 'Quote']"}).nullable(),
  dropoffLongitude: z.instanceof(Prisma.Decimal, { message: "Field 'dropoffLongitude' must be a Decimal. Location: ['Models', 'Quote']"}).nullable(),
  isRoundTrip: z.boolean(),
  stops: JsonValueSchema.nullable(),
  returnDate: z.coerce.date().nullable(),
  durationHours: z.instanceof(Prisma.Decimal, { message: "Field 'durationHours' must be a Decimal. Location: ['Models', 'Quote']"}).nullable(),
  maxKilometers: z.instanceof(Prisma.Decimal, { message: "Field 'maxKilometers' must be a Decimal. Location: ['Models', 'Quote']"}).nullable(),
  passengerCount: z.number().int(),
  luggageCount: z.number().int(),
  vehicleCategoryId: z.string(),
  suggestedPrice: z.instanceof(Prisma.Decimal, { message: "Field 'suggestedPrice' must be a Decimal. Location: ['Models', 'Quote']"}),
  finalPrice: z.instanceof(Prisma.Decimal, { message: "Field 'finalPrice' must be a Decimal. Location: ['Models', 'Quote']"}),
  internalCost: z.instanceof(Prisma.Decimal, { message: "Field 'internalCost' must be a Decimal. Location: ['Models', 'Quote']"}).nullable(),
  marginPercent: z.instanceof(Prisma.Decimal, { message: "Field 'marginPercent' must be a Decimal. Location: ['Models', 'Quote']"}).nullable(),
  commissionPercent: z.instanceof(Prisma.Decimal, { message: "Field 'commissionPercent' must be a Decimal. Location: ['Models', 'Quote']"}).nullable(),
  commissionAmount: z.instanceof(Prisma.Decimal, { message: "Field 'commissionAmount' must be a Decimal. Location: ['Models', 'Quote']"}).nullable(),
  tripAnalysis: JsonValueSchema.nullable(),
  appliedRules: JsonValueSchema.nullable(),
  costBreakdown: JsonValueSchema.nullable(),
  validUntil: z.coerce.date().nullable(),
  notes: z.string().nullable(),
  sentAt: z.coerce.date().nullable(),
  viewedAt: z.coerce.date().nullable(),
  acceptedAt: z.coerce.date().nullable(),
  rejectedAt: z.coerce.date().nullable(),
  expiredAt: z.coerce.date().nullable(),
  assignedVehicleId: z.string().nullable(),
  assignedDriverId: z.string().nullable(),
  assignedAt: z.coerce.date().nullable(),
  chainId: z.string().nullable(),
  chainOrder: z.number().int().nullable(),
  chainedWithId: z.string().nullable(),
  isSubcontracted: z.boolean(),
  subcontractorId: z.string().nullable(),
  subcontractedPrice: z.instanceof(Prisma.Decimal, { message: "Field 'subcontractedPrice' must be a Decimal. Location: ['Models', 'Quote']"}).nullable(),
  subcontractedAt: z.coerce.date().nullable(),
  subcontractingNotes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  vehicleId: z.string().nullable(),
  driverId: z.string().nullable(),
})

export type Quote = z.infer<typeof QuoteSchema>

/////////////////////////////////////////
// INVOICE SCHEMA
/////////////////////////////////////////

/**
 * Invoice - Immutable financial document derived from accepted quotes
 */
export const InvoiceSchema = z.object({
  status: InvoiceStatusSchema,
  id: z.string().cuid(),
  organizationId: z.string(),
  quoteId: z.string().nullable(),
  contactId: z.string(),
  number: z.string(),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  totalExclVat: z.instanceof(Prisma.Decimal, { message: "Field 'totalExclVat' must be a Decimal. Location: ['Models', 'Invoice']"}),
  totalVat: z.instanceof(Prisma.Decimal, { message: "Field 'totalVat' must be a Decimal. Location: ['Models', 'Invoice']"}),
  totalInclVat: z.instanceof(Prisma.Decimal, { message: "Field 'totalInclVat' must be a Decimal. Location: ['Models', 'Invoice']"}),
  currency: z.string(),
  commissionAmount: z.instanceof(Prisma.Decimal, { message: "Field 'commissionAmount' must be a Decimal. Location: ['Models', 'Invoice']"}).nullable(),
  costBreakdown: JsonValueSchema.nullable(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Invoice = z.infer<typeof InvoiceSchema>

/////////////////////////////////////////
// INVOICE LINE SCHEMA
/////////////////////////////////////////

/**
 * InvoiceLine - Line items for services, optional fees, discounts
 */
export const InvoiceLineSchema = z.object({
  lineType: InvoiceLineTypeSchema,
  id: z.string().cuid(),
  invoiceId: z.string(),
  description: z.string(),
  quantity: z.instanceof(Prisma.Decimal, { message: "Field 'quantity' must be a Decimal. Location: ['Models', 'InvoiceLine']"}),
  unitPriceExclVat: z.instanceof(Prisma.Decimal, { message: "Field 'unitPriceExclVat' must be a Decimal. Location: ['Models', 'InvoiceLine']"}),
  vatRate: z.instanceof(Prisma.Decimal, { message: "Field 'vatRate' must be a Decimal. Location: ['Models', 'InvoiceLine']"}),
  totalExclVat: z.instanceof(Prisma.Decimal, { message: "Field 'totalExclVat' must be a Decimal. Location: ['Models', 'InvoiceLine']"}),
  totalVat: z.instanceof(Prisma.Decimal, { message: "Field 'totalVat' must be a Decimal. Location: ['Models', 'InvoiceLine']"}),
  sortOrder: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type InvoiceLine = z.infer<typeof InvoiceLineSchema>

/////////////////////////////////////////
// DOCUMENT TYPE SCHEMA
/////////////////////////////////////////

/**
 * DocumentType - Classify generated documents
 */
export const DocumentTypeSchema = z.object({
  id: z.string().cuid(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
})

export type DocumentType = z.infer<typeof DocumentTypeSchema>

/////////////////////////////////////////
// DOCUMENT SCHEMA
/////////////////////////////////////////

/**
 * Document - Store generated artefacts (PDFs, etc.)
 */
export const DocumentSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  documentTypeId: z.string(),
  quoteId: z.string().nullable(),
  invoiceId: z.string().nullable(),
  storagePath: z.string().nullable(),
  url: z.string().nullable(),
  filename: z.string().nullable(),
  createdAt: z.coerce.date(),
})

export type Document = z.infer<typeof DocumentSchema>

/////////////////////////////////////////
// FUEL PRICE CACHE SCHEMA
/////////////////////////////////////////

/**
 * FuelPriceCache - Cache layer for fuel prices from CollectAPI
 */
export const FuelPriceCacheSchema = z.object({
  fuelType: FuelTypeSchema,
  id: z.string().cuid(),
  countryCode: z.string(),
  latitude: z.instanceof(Prisma.Decimal, { message: "Field 'latitude' must be a Decimal. Location: ['Models', 'FuelPriceCache']"}),
  longitude: z.instanceof(Prisma.Decimal, { message: "Field 'longitude' must be a Decimal. Location: ['Models', 'FuelPriceCache']"}),
  pricePerLitre: z.instanceof(Prisma.Decimal, { message: "Field 'pricePerLitre' must be a Decimal. Location: ['Models', 'FuelPriceCache']"}),
  currency: z.string(),
  source: z.string(),
  fetchedAt: z.coerce.date(),
})

export type FuelPriceCache = z.infer<typeof FuelPriceCacheSchema>

/////////////////////////////////////////
// ORGANIZATION INTEGRATION SETTINGS SCHEMA
/////////////////////////////////////////

/**
 * OrganizationIntegrationSettings - Per-organisation integration settings and API keys
 */
export const OrganizationIntegrationSettingsSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  googleMapsApiKey: z.string().nullable(),
  collectApiKey: z.string().nullable(),
  preferredFuelType: z.string().nullable(),
  googleMapsStatus: z.string().nullable(),
  googleMapsTestedAt: z.coerce.date().nullable(),
  collectApiStatus: z.string().nullable(),
  collectApiTestedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type OrganizationIntegrationSettings = z.infer<typeof OrganizationIntegrationSettingsSchema>

/////////////////////////////////////////
// DRIVER RSE COUNTER SCHEMA
/////////////////////////////////////////

/**
 * DriverRSECounter - Tracks RSE counters per driver, per day, per regulatory regime
 */
export const DriverRSECounterSchema = z.object({
  regulatoryCategory: VehicleRegulatoryCategorySchema,
  id: z.string().cuid(),
  organizationId: z.string(),
  driverId: z.string(),
  date: z.coerce.date(),
  licenseCategoryId: z.string().nullable(),
  drivingMinutes: z.number().int(),
  amplitudeMinutes: z.number().int(),
  breakMinutes: z.number().int(),
  restMinutes: z.number().int(),
  workStartTime: z.coerce.date().nullable(),
  workEndTime: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type DriverRSECounter = z.infer<typeof DriverRSECounterSchema>

/////////////////////////////////////////
// COMPLIANCE AUDIT LOG SCHEMA
/////////////////////////////////////////

/**
 * ComplianceAuditLog - Logs compliance decisions for audit purposes (FR30)
 */
export const ComplianceAuditLogSchema = z.object({
  regulatoryCategory: VehicleRegulatoryCategorySchema,
  id: z.string().cuid(),
  organizationId: z.string(),
  driverId: z.string(),
  timestamp: z.coerce.date(),
  quoteId: z.string().nullable(),
  missionId: z.string().nullable(),
  vehicleCategoryId: z.string().nullable(),
  decision: z.string(),
  violations: JsonValueSchema.nullable(),
  warnings: JsonValueSchema.nullable(),
  reason: z.string(),
  countersSnapshot: JsonValueSchema.nullable(),
})

export type ComplianceAuditLog = z.infer<typeof ComplianceAuditLogSchema>

/////////////////////////////////////////
// QUOTE STATUS AUDIT LOG SCHEMA
/////////////////////////////////////////

/**
 * QuoteStatusAuditLog - Tracks quote status transitions for audit purposes
 */
export const QuoteStatusAuditLogSchema = z.object({
  previousStatus: QuoteStatusSchema,
  newStatus: QuoteStatusSchema,
  id: z.string().cuid(),
  organizationId: z.string(),
  quoteId: z.string(),
  userId: z.string().nullable(),
  timestamp: z.coerce.date(),
  reason: z.string().nullable(),
})

export type QuoteStatusAuditLog = z.infer<typeof QuoteStatusAuditLogSchema>

/////////////////////////////////////////
// TOLL CACHE SCHEMA
/////////////////////////////////////////

/**
 * TollCache - Caches toll costs from Google Routes API
 * Story 15.1: Integrate Google Routes API for Real Toll Costs
 */
export const TollCacheSchema = z.object({
  id: z.string().cuid(),
  originHash: z.string(),
  destinationHash: z.string(),
  tollAmount: z.instanceof(Prisma.Decimal, { message: "Field 'tollAmount' must be a Decimal. Location: ['Models', 'TollCache']"}),
  currency: z.string(),
  source: z.string(),
  fetchedAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
})

export type TollCache = z.infer<typeof TollCacheSchema>
