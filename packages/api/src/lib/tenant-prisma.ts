/**
 * Tenant-scoped Prisma utilities for VTC ERP multi-tenancy.
 *
 * These utilities ensure all database operations are properly scoped
 * to the current organization, preventing cross-tenant data leakage.
 */

/**
 * Injects organizationId into create operations.
 *
 * @param data - The data object for Prisma create
 * @param organizationId - The organization ID from the session
 * @returns The data object with organizationId included
 *
 * @example
 * const contact = await db.contact.create({
 *   data: withTenantCreate({ displayName: "John Doe" }, organizationId)
 * });
 */
export function withTenantCreate<T extends Record<string, unknown>>(
	data: T,
	organizationId: string,
): T & { organizationId: string } {
	return {
		...data,
		organizationId,
	};
}

/**
 * Adds organizationId to WHERE clauses for read/update/delete operations.
 *
 * @param where - The WHERE clause object for Prisma queries
 * @param organizationId - The organization ID from the session
 * @returns The WHERE clause with organizationId filter included
 *
 * @example
 * const contacts = await db.contact.findMany({
 *   where: withTenantFilter({ email: "test@example.com" }, organizationId)
 * });
 */
export function withTenantFilter<T extends Record<string, unknown>>(
	where: T,
	organizationId: string,
): T & { organizationId: string } {
	return {
		...where,
		organizationId,
	};
}

/**
 * Finds a single entity by ID with tenant isolation.
 * Returns null if the entity doesn't exist or belongs to a different organization.
 *
 * This pattern ensures cross-tenant access attempts result in 404 (not found)
 * rather than 403 (forbidden), preventing information leakage about record existence.
 *
 * @param id - The entity ID
 * @param organizationId - The organization ID from the session
 * @returns The WHERE clause for findUnique/findFirst
 *
 * @example
 * const contact = await db.contact.findFirst({
 *   where: withTenantId(contactId, organizationId)
 * });
 * if (!contact) {
 *   throw new HTTPException(404, { message: "Contact not found" });
 * }
 */
export function withTenantId(
	id: string,
	organizationId: string,
): { id: string; organizationId: string } {
	return {
		id,
		organizationId,
	};
}

/**
 * Type helper for tenant-scoped data input.
 * Use this when you need to type data that will be passed through withTenantCreate.
 */
export type TenantCreateInput<T> = T & { organizationId: string };

/**
 * Type helper for tenant-scoped WHERE input.
 * Use this when you need to type WHERE clauses that will be passed through withTenantFilter.
 */
export type TenantWhereInput<T> = T & { organizationId: string };
