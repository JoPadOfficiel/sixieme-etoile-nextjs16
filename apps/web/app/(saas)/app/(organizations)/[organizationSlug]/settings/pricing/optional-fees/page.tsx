/**
 * Redirect: Optional Fees → Extras & Promotions
 * Story 11.5: Merge Optional Fees & Promotions Pages
 *
 * This page has been merged into /settings/pricing/extras
 */

import { redirect } from "next/navigation";

export default async function OptionalFeesRedirectPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	redirect(`/app/${organizationSlug}/settings/pricing/extras?tab=fees`);
}
