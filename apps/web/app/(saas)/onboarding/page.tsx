import { config } from "@repo/config";
import { getSession } from "@saas/auth/lib/server";
import { OnboardingForm } from "@saas/onboarding/components/OnboardingForm";
import { Footer } from "@saas/shared/components/Footer";
import { ColorModeToggle } from "@shared/components/ColorModeToggle";
import { LocaleSwitch } from "@shared/components/LocaleSwitch";
import { Logo } from "@shared/components/Logo";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata() {
	const t = await getTranslations();

	return {
		title: t("onboarding.title"),
	};
}

export default async function OnboardingPage() {
	const session = await getSession();

	if (!session) {
		return redirect("/auth/login");
	}

	if (!config.users.enableOnboarding || session.user.onboardingComplete) {
		return redirect("/app");
	}

	return (
		<div className="flex min-h-screen w-full bg-card p-8">
			<div className="flex w-full flex-col items-center justify-between">
				<div className="">
					<div className="flex items-center justify-between">
						<Link href="/" className="block">
							<Logo />
						</Link>

						<div className="flex items-center justify-end gap-2">
							{config.i18n.enabled && <LocaleSwitch withLocaleInUrl={false} />}
							<ColorModeToggle />
						</div>
					</div>
				</div>

				<div className="w-full max-w-md">
					<OnboardingForm />
				</div>

				<Footer />
			</div>
		</div>
	);
}
