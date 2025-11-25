import { IntegrationSettingsForm } from "@saas/settings/components/IntegrationSettingsForm";
import { SettingsList } from "@saas/shared/components/SettingsList";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
	const t = await getTranslations();

	return {
		title: t("organizations.settings.integrations.title"),
	};
}

export default function IntegrationSettingsPage() {
	return (
		<SettingsList>
			<IntegrationSettingsForm />
		</SettingsList>
	);
}
