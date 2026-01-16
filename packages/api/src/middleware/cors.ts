import { getBaseUrl } from "@repo/utils";
import { cors } from "hono/cors";

export const corsMiddleware = cors({
	origin: getBaseUrl(),
	allowHeaders: ["Content-Type", "Authorization", "x-organization-id"],
	allowMethods: ["POST", "GET", "OPTIONS", "PATCH", "PUT", "DELETE"],
	exposeHeaders: ["Content-Length"],
	maxAge: 600,
	credentials: true,
});
