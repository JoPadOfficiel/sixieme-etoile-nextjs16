import { type Session, auth } from "@repo/auth";
import { db } from "@repo/database";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

/**
 * Organization middleware for VTC ERP multi-tenancy.
 *
 * This middleware:
 * 1. Authenticates the user via the auth API
 * 2. Extracts the activeOrganizationId from the session
 * 3. Validates that the user is a member of the organization
 * 4. Sets session, user, and organizationId in the Hono context
 *
 * Use this middleware for all VTC ERP endpoints that require tenant isolation.
 */
export const organizationMiddleware = createMiddleware<{
	Variables: {
		session: Session["session"];
		user: Session["user"];
		organizationId: string;
	};
}>(async (c, next) => {
	// Get session from auth API
	const session = await auth.api.getSession({
		headers: c.req.raw.headers,
	});

	if (!session) {
		throw new HTTPException(401, {
			message: "Unauthorized",
		});
	}

	// Extract activeOrganizationId from session
	const organizationId = session.session.activeOrganizationId;

	if (!organizationId) {
		throw new HTTPException(400, {
			message: "No active organization selected",
		});
	}

	// Verify user is a member of the organization
	const membership = await db.member.findUnique({
		where: {
			userId_organizationId: {
				userId: session.user.id,
				organizationId: organizationId,
			},
		},
	});

	if (!membership) {
		throw new HTTPException(403, {
			message: "You are not a member of this organization",
		});
	}

	// Set context variables for downstream handlers
	c.set("session", session.session);
	c.set("user", session.user);
	c.set("organizationId", organizationId);

	await next();
});
