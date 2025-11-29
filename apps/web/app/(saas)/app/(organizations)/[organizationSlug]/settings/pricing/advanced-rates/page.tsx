/**
 * Redirect: Advanced Rates → Pricing Adjustments
 * Story 11.4: Merge Seasonal Multipliers & Advanced Rates Pages
 *
 * This page has been merged into /settings/pricing/adjustments
 */

import { redirect } from "next/navigation";

export default async function AdvancedRatesRedirectPage({
params,
}: {
params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	redirect(`/app/${organizationSlug}/settings/pricing/adjustments?tab=time-based`);
}
