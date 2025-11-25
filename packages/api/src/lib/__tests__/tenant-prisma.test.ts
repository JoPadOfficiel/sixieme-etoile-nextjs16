import { describe, expect, it } from "vitest";
import {
	withTenantCreate,
	withTenantFilter,
	withTenantId,
} from "../tenant-prisma";

describe("Tenant Prisma Utilities", () => {
	const testOrgId = "org_test123";

	describe("withTenantCreate", () => {
		it("should inject organizationId into create data", () => {
			const data = { displayName: "Test Contact", email: "test@example.com" };
			const result = withTenantCreate(data, testOrgId);

			expect(result).toEqual({
				displayName: "Test Contact",
				email: "test@example.com",
				organizationId: testOrgId,
			});
		});

		it("should preserve existing properties", () => {
			const data = { name: "Test", isActive: true, count: 5 };
			const result = withTenantCreate(data, testOrgId);

			expect(result.name).toBe("Test");
			expect(result.isActive).toBe(true);
			expect(result.count).toBe(5);
			expect(result.organizationId).toBe(testOrgId);
		});

		it("should work with empty object", () => {
			const result = withTenantCreate({}, testOrgId);
			expect(result).toEqual({ organizationId: testOrgId });
		});
	});

	describe("withTenantFilter", () => {
		it("should add organizationId to where clause", () => {
			const where = { email: "test@example.com" };
			const result = withTenantFilter(where, testOrgId);

			expect(result).toEqual({
				email: "test@example.com",
				organizationId: testOrgId,
			});
		});

		it("should work with complex where clauses", () => {
			const where = {
				OR: [{ name: "A" }, { name: "B" }],
				isActive: true,
			};
			const result = withTenantFilter(where, testOrgId);

			expect(result.OR).toEqual([{ name: "A" }, { name: "B" }]);
			expect(result.isActive).toBe(true);
			expect(result.organizationId).toBe(testOrgId);
		});

		it("should work with empty where clause", () => {
			const result = withTenantFilter({}, testOrgId);
			expect(result).toEqual({ organizationId: testOrgId });
		});
	});

	describe("withTenantId", () => {
		it("should create where clause with id and organizationId", () => {
			const entityId = "entity_123";
			const result = withTenantId(entityId, testOrgId);

			expect(result).toEqual({
				id: entityId,
				organizationId: testOrgId,
			});
		});
	});
});
