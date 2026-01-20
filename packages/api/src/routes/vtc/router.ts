import { Hono } from "hono";
import { advancedRatesRouter } from "./advanced-rates";
import { basesRouter } from "./bases";
// Story 26.13: Block Templates
import { blockTemplatesRouter } from "./block-templates";
import { complianceRouter } from "./compliance";
import { contactsRouter } from "./contacts";
import { disposRouter } from "./dispos";
import { documentsRouter } from "./documents";
import { driversRouter } from "./drivers";
import { emptyLegsRouter, missionEmptyLegRouter } from "./empty-legs";
// Story 24.2: EndCustomer CRUD API
import { contactEndCustomersRouter, endCustomersRouter } from "./end-customers";
import { excursionsRouter } from "./excursions";
import { integrationsRouter } from "./integrations";
import { invoicesRouter } from "./invoices";
// Story 25.6: Bulk Payment / Lettrage
import { invoicesBulkPaymentRouter } from "./invoices-bulk-payment";
import { licenseCategoriesRouter } from "./license-categories";
import { licenseRulesRouter } from "./license-rules";
import { missionsRouter } from "./missions";
import { optionalFeesRouter } from "./optional-fees";
import { organizationDetailsRouter } from "./organization-details";
import {
	dispoAssignmentsRouter,
	excursionAssignmentsRouter,
	partnersListRouter,
	zoneRouteAssignmentsRouter,
} from "./partner-assignments";
import { partnerContractsRouter } from "./partner-contracts";
import { postalCodesRouter } from "./postal-codes";
import { pricingCalculateRouter } from "./pricing-calculate";
import { pricingSettingsRouter } from "./pricing-settings";
import { pricingZonesRouter } from "./pricing-zones";
import { promotionsRouter } from "./promotions";
import { quoteCostsRouter } from "./quote-costs";
// Story 26.4: Quote Lines CRUD API for Hybrid Blocks
import { quoteLinesRouter } from "./quote-lines";
import { quotesRouter } from "./quotes";
import { reportsRouter } from "./reports";
import { routesCoverageRouter } from "./routes-coverage";
import { seasonalMultipliersRouter } from "./seasonal-multipliers";
import { stayQuotesRouter } from "./stay-quotes";
import {
	missionSubcontractingRoutes,
	subcontractorsRouter,
} from "./subcontractors";
import { timeBucketsRouter } from "./time-buckets";
import { vehicleCategoriesRouter } from "./vehicle-categories";
import { vehiclesRouter } from "./vehicles";
import { zoneRoutesRouter } from "./zone-routes";
// Story 28.2: Order Management API
import { ordersRouter } from "./orders";

/**
 * VTC ERP Router
 *
 * Main router for all VTC ERP endpoints.
 * All routes are prefixed with /vtc and protected by organizationMiddleware.
 */
export const vtcRouter = new Hono()
	.basePath("/vtc")
	.route("/", complianceRouter)
	.route("/", contactsRouter)
	.route("/", vehiclesRouter)
	.route("/", vehicleCategoriesRouter)
	.route("/", basesRouter)
	.route("/", driversRouter)
	.route("/", licenseCategoriesRouter)
	.route("/", licenseRulesRouter)
	// Story 26.13: Block Templates - MUST be before quotesRouter to avoid /:id conflict
	.route("/", blockTemplatesRouter)
	.route("/", quotesRouter)
	// Story 26.4: Quote Lines CRUD API for Hybrid Blocks
	.route("/", quoteLinesRouter)
	.route("/", quoteCostsRouter)
	.route("/", integrationsRouter)
	.route("/", partnerContractsRouter)
	.route("/", pricingCalculateRouter)
	.route("/", pricingZonesRouter)
	.route("/", postalCodesRouter)
	.route("/", routesCoverageRouter)
	.route("/", zoneRoutesRouter)
	.route("/", excursionsRouter)
	.route("/", disposRouter)
	.route("/", invoicesRouter)
	.route("/", documentsRouter)
	.route("/", missionsRouter)
	.route("/", emptyLegsRouter)
	.route("/", missionEmptyLegRouter)
	.route("/", subcontractorsRouter)
	.route("/", missionSubcontractingRoutes)
	.route("/", seasonalMultipliersRouter)
	.route("/", timeBucketsRouter)
	.route("/", advancedRatesRouter)
	.route("/", optionalFeesRouter)
	.route("/", promotionsRouter)
	.route("/", pricingSettingsRouter)
	.route("/", reportsRouter)
	// Story 14.6: Partner assignments from pricing UI
	.route("/", zoneRouteAssignmentsRouter)
	.route("/", excursionAssignmentsRouter)
	.route("/", dispoAssignmentsRouter)
	.route("/", partnersListRouter)
	// Story 22.5: Stay quotes (multi-day packages)
	.route("/", stayQuotesRouter)
	// Story 24.2: EndCustomer CRUD API
	.route("/", endCustomersRouter)
	.route("/", contactEndCustomersRouter)
	// Story 25.6: Bulk Payment / Lettrage
	.route("/", invoicesBulkPaymentRouter)
	.route("/", organizationDetailsRouter)
	// Story 28.2: Order Management API
	.route("/", ordersRouter);

export type VtcRouter = typeof vtcRouter;
