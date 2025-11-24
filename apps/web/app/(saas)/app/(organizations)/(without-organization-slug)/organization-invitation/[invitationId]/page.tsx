import { auth } from "@repo/auth";
import { OrganizationInvitationModal } from "@saas/organizations/components/OrganizationInvitationModal";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function OrganizationInvitationPage({
	params,
}: {
	params: Promise<{ invitationId: string }>;
}) {
	const { invitationId } = await params;

	const invitation = await auth.api.getInvitation({
		query: {
			id: invitationId,
		},
		headers: await headers(),
	});

	if (!invitation) {
		redirect("/app");
	}

	return (
		<OrganizationInvitationModal
			organizationName={invitation.organizationName}
			organizationSlug={invitation.organizationSlug}
			invitationId={invitationId}
		/>
	);
}
