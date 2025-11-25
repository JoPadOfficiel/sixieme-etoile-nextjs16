import { Hono } from "hono";
import { contactsRouter } from "./contacts";
import { integrationsRouter } from "./integrations";
import { quotesRouter } from "./quotes";
import { vehiclesRouter } from "./vehicles";

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
	.route("/", integrationsRouter);

export type VtcRouter = typeof vtcRouter;
