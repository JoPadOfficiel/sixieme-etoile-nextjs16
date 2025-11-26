import { Hono } from "hono";
import { contactsRouter } from "./contacts";
import { disposRouter } from "./dispos";
import { excursionsRouter } from "./excursions";
import { integrationsRouter } from "./integrations";
import { partnerContractsRouter } from "./partner-contracts";
import { pricingZonesRouter } from "./pricing-zones";
import { quotesRouter } from "./quotes";
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
	.route("/", quotesRouter)
	.route("/", integrationsRouter)
	.route("/", partnerContractsRouter)
	.route("/", pricingZonesRouter)
	.route("/", zoneRoutesRouter)
	.route("/", excursionsRouter)
	.route("/", disposRouter);

export type VtcRouter = typeof vtcRouter;
