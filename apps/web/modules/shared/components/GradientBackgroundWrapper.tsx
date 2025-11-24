import type { PropsWithChildren } from "react";

export function GradientBackgroundWrapper({ children }: PropsWithChildren) {
	return (
		<div className="relative min-h-screen max-w-full overflow-x-hidden bg-gradient-to-b from-0% from-card to-[50vh] to-background">
			<div className="absolute left-1/2 z-10 ml-[-500px] h-[500px] w-[1000px] rounded-full bg-gradient-to-r from-primary to-bg opacity-15 blur-[150px]" />
			<div className="relative z-20">{children}</div>
		</div>
	);
}
