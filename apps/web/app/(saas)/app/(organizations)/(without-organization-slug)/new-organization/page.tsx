import { config } from "@repo/config";
import { CreateOrganizationForm } from "@saas/organizations/components/CreateOrganizationForm";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewOrganizationPage() {
	if (!config.organizations.enableUsersToCreateOrganizations) {
		return redirect("/app");
	}

	return <CreateOrganizationForm />;
}
