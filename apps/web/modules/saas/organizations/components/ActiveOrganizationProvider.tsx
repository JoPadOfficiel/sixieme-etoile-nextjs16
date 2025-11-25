"use client";

import { authClient } from "@repo/auth/client";
import { config } from "@repo/config";
import { useSession } from "@saas/auth/hooks/use-session";
import { sessionQueryKey } from "@saas/auth/lib/api";
import {
	activeOrganizationQueryKey,
	useActiveOrganizationQuery,
} from "@saas/organizations/lib/api";
import { purchasesQueryKey } from "@saas/payments/lib/api";
import { useRouter } from "@shared/hooks/router";
import { apiClient } from "@shared/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import nProgress from "nprogress";
import { type ReactNode, useEffect, useState, useRef } from "react";
import { ActiveOrganizationContext } from "../lib/active-organization-context";

export function ActiveOrganizationProvider({
	children,
}: {
	children: ReactNode;
}) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { session } = useSession();
	const params = useParams();

	const activeOrganizationSlug = params.organizationSlug as string;
	const syncingRef = useRef(false);
	const lastSyncedSlugRef = useRef<string | null>(null);

	const { data: activeOrganization } = useActiveOrganizationQuery(
		activeOrganizationSlug,
		{
			enabled: !!activeOrganizationSlug,
		},
	);

	// Auto-sync activeOrganizationId in session when URL slug changes
	// Note: better-auth stores the slug in activeOrganizationId, not the id
	useEffect(() => {
		const syncActiveOrganization = async () => {
			// Skip if already syncing, no organization loaded, or no slug
			if (syncingRef.current || !activeOrganization || !activeOrganizationSlug) {
				return;
			}

			// Check if we already synced this slug (prevents infinite loop)
			if (lastSyncedSlugRef.current === activeOrganizationSlug) {
				return;
			}

			// Check if session's activeOrganizationId matches the current organization
			// better-auth stores slug in activeOrganizationId, so compare with both id and slug
			const currentActiveOrgId = session?.activeOrganizationId;
			if (currentActiveOrgId === activeOrganization.id || currentActiveOrgId === activeOrganization.slug) {
				lastSyncedSlugRef.current = activeOrganizationSlug;
				return; // Already synced
			}

			// Sync the active organization in the session
			syncingRef.current = true;
			try {
				await authClient.organization.setActive({
					organizationSlug: activeOrganizationSlug,
				});

				// Mark as synced to prevent re-triggering
				lastSyncedSlugRef.current = activeOrganizationSlug;

				// Update session query cache with the slug (what better-auth actually stores)
				queryClient.setQueryData(sessionQueryKey, (data: unknown) => {
					if (!data || typeof data !== 'object') return data;
					const sessionData = data as { session?: { activeOrganizationId?: string } };
					return {
						...sessionData,
						session: {
							...sessionData.session,
							activeOrganizationId: activeOrganization.slug,
						},
					};
				});
			} catch (error) {
				console.error("Failed to sync active organization:", error);
			} finally {
				syncingRef.current = false;
			}
		};

		syncActiveOrganization();
	}, [activeOrganization, activeOrganizationSlug, session?.activeOrganizationId, queryClient]);

	const refetchActiveOrganization = async () => {
		await queryClient.refetchQueries({
			queryKey: activeOrganizationQueryKey(activeOrganizationSlug),
		});
	};

	const setActiveOrganization = async (organizationSlug: string | null) => {
		nProgress.start();
		const { data: newActiveOrganization } =
			await authClient.organization.setActive(
				organizationSlug
					? {
							organizationSlug,
						}
					: {
							organizationId: null,
						},
			);

		if (!newActiveOrganization) {
			nProgress.done();
			return;
		}

		await queryClient.setQueryData(
			activeOrganizationQueryKey(newActiveOrganization.slug),
			newActiveOrganization,
		);

		if (config.organizations.enableBilling) {
			await queryClient.prefetchQuery({
				queryKey: purchasesQueryKey(newActiveOrganization.id),
				queryFn: async () => {
					const response = await apiClient.payments.purchases.$get({
						query: {
							organizationId: newActiveOrganization.id,
						},
					});

					if (!response.ok) {
						throw new Error("Failed to fetch purchases");
					}

					return response.json();
				},
			});
		}

		// Update session cache with slug (what better-auth actually stores)
		queryClient.setQueryData(sessionQueryKey, (data: unknown) => {
			if (!data || typeof data !== 'object') return data;
			const sessionData = data as { session?: { activeOrganizationId?: string } };
			return {
				...sessionData,
				session: {
					...sessionData.session,
					activeOrganizationId: newActiveOrganization.slug,
				},
			};
		});

		router.push(`/app/${newActiveOrganization.slug}`);
	};

	const [loaded, setLoaded] = useState(activeOrganization !== undefined);

	useEffect(() => {
		if (!loaded && activeOrganization !== undefined) {
			setLoaded(true);
		}
	}, [activeOrganization, loaded]);

	// Check if session is synced with current organization
	// Note: better-auth stores slug in activeOrganizationId
	const isSessionSynced = !!(
		activeOrganization &&
		(session?.activeOrganizationId === activeOrganization.id ||
		 session?.activeOrganizationId === activeOrganization.slug)
	);

	const activeOrganizationUserRole = activeOrganization?.members.find(
		(member) => member.userId === session?.userId,
	)?.role;

	const isOrganizationAdmin =
		!!activeOrganizationUserRole &&
		["admin", "owner"].includes(activeOrganizationUserRole);

	return (
		<ActiveOrganizationContext.Provider
			value={{
				loaded,
				isSessionSynced,
				activeOrganization: activeOrganization ?? null,
				activeOrganizationUserRole: activeOrganizationUserRole ?? null,
				isOrganizationAdmin,
				setActiveOrganization,
				refetchActiveOrganization,
			}}
		>
			{children}
		</ActiveOrganizationContext.Provider>
	);
}
