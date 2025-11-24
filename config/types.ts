export type Config = {
	i18n: {
		enabled: boolean;
		locales: { [locale: string]: { currency: string; label: string } };
		defaultLocale: string;
		defaultCurrency: string;
		localeCookieName: string;
	};
	organizations: {
		enable: boolean;
		enableBilling: boolean;
		enableUsersToCreateOrganizations: boolean;
		requireOrganization: boolean;
		hideOrganization: boolean;
		forbiddenOrganizationSlugs: string[];
	};
	users: {
		enableBilling: boolean;
		enableOnboarding: boolean;
	};
	auth: {
		enableSignup: boolean;
		redirectAfterSignIn: string;
		redirectAfterLogout: string;
		sessionCookieMaxAge: number;
	};
	mails: {
		from: string;
	};
	storage: {
		bucketNames: {
			avatars: string;
		};
	};
	ui: {
		enabledThemes: Array<"light" | "dark">;
		defaultTheme: Config["ui"]["enabledThemes"][number];
		saas: {
			enabled: boolean;
			useSidebarLayout: boolean;
		};
		marketing: {
			enabled: boolean;
		};
	};
	payments: {
		plans: {
			[id: string]: {
				hidden?: boolean;
				isFree?: boolean;
				isEnterprise?: boolean;
				recommended?: boolean;
				prices?: Array<
					{
						productId: string;
						amount: number;
						currency: string;
						hidden?: boolean;
					} & (
						| {
								type: "recurring";
								interval: "month" | "year" | "week";
								intervalCount?: number;
								trialPeriodDays?: number;
						  }
						| {
								type: "one-time";
						  }
					)
				>;
			};
		};
	};
};
