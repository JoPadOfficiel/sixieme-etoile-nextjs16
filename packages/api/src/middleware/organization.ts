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
 * 3. Resolves the organization (supports both id and slug)
 * 4. Validates that the user is a member of the organization
 * 5. Sets session, user, and organizationId in the Hono context
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

	// Extract activeOrganizationId from session (can be id or slug)
	const activeOrgIdOrSlug = session.session.activeOrganizationId;

	if (!activeOrgIdOrSlug) {
		throw new HTTPException(400, {
			message: "No active organization selected",
		});
	}

	// Resolve organization - try by id first, then by slug
	const organization = await db.organization.findFirst({
		where: {
			OR: [{ id: activeOrgIdOrSlug }, { slug: activeOrgIdOrSlug }],
		},
		select: { id: true },
	});

	if (!organization) {
		throw new HTTPException(404, {
			message: "Organization not found",
		});
	}

	const organizationId = organization.id;

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
