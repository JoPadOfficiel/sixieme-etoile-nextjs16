import { Hono } from "hono";
import { basesRouter } from "./bases";
import { contactsRouter } from "./contacts";
import { disposRouter } from "./dispos";
import { excursionsRouter } from "./excursions";
import { integrationsRouter } from "./integrations";
import { partnerContractsRouter } from "./partner-contracts";
import { pricingCalculateRouter } from "./pricing-calculate";
import { pricingZonesRouter } from "./pricing-zones";
import { quotesRouter } from "./quotes";
import { routesCoverageRouter } from "./routes-coverage";
import { vehicleCategoriesRouter } from "./vehicle-categories";
import { vehiclesRouter } from "./vehicles";
import { zoneRoutesRouter } from "./zone-routes";

/**
 * VTC ERP Router
 *
 * Main router for all VTC ERP endpoints.
 * All routes are prefixed with /vtc and protected by organizationMiddleware.
 */
export const vtcRouter = new Hono()
	.basePath("/vtc")
	.route("/", contactsRouter)
	.route("/", vehiclesRouter)
	.route("/", vehicleCategoriesRouter)
	.route("/", basesRouter)
	.route("/", quotesRouter)
	.route("/", integrationsRouter)
	.route("/", partnerContractsRouter)
	.route("/", pricingCalculateRouter)
	.route("/", pricingZonesRouter)
	.route("/", routesCoverageRouter)
	.route("/", zoneRoutesRouter)
	.route("/", excursionsRouter)
	.route("/", disposRouter);

export type VtcRouter = typeof vtcRouter;
