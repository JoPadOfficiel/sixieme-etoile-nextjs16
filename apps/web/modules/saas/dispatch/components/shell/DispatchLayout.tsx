"use client";
import { DispatchHeader } from "./DispatchHeader";

interface DispatchLayoutProps {
	sidebar: React.ReactNode;
	inspector?: React.ReactNode;
	children: React.ReactNode;
}

export function DispatchLayout({
	sidebar,
	inspector,
	children,
}: DispatchLayoutProps) {
	return (
		<div className="flex h-screen w-full flex-col overflow-hidden bg-background">
			{/* Header */}
			{/* Header */}
			<DispatchHeader />

			{/* Main Grid */}
			<div className="relative flex flex-1 flex-col overflow-hidden lg:flex-row">
				{/* Left Sidebar (Backlog) */}
				<aside className="z-10 h-auto w-full flex-shrink-0 border-b lg:h-full lg:w-auto lg:border-r lg:border-b-0">
					{sidebar}
				</aside>

				{/* Center Main Area */}
				<main className="relative z-0 flex min-w-0 flex-1 flex-col overflow-hidden">
					{children}
				</main>

				{/* Right Inspector */}
				<aside className="z-10 h-auto w-full flex-shrink-0 border-t lg:h-full lg:w-auto lg:border-t-0 lg:border-l">
					{inspector}
				</aside>
			</div>
		</div>
	);
}
