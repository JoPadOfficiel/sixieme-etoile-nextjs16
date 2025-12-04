"use client";

import { Card, CardContent } from "@ui/components/card";
import { Skeleton } from "@ui/components/skeleton";
import { MapIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";
import { MissionRow } from "./MissionRow";
import type { MissionListItem } from "../types";

/**
 * MissionsList Component
 *
 * Story 8.1: Implement Dispatch Screen Layout
 *
 * Left panel of the Dispatch screen showing the list of missions.
 * Uses compact card layout to avoid horizontal scrolling.
 * Supports selection, loading states, and empty states.
 *
 * @see AC2: Missions List Display
 * @see AC8: Empty State
 * @see AC9: Loading States
 */

interface MissionsListProps {
	missions: MissionListItem[];
	selectedMissionId: string | null;
	onSelectMission: (missionId: string) => void;
	isLoading: boolean;
	className?: string;
}

export function MissionsList({
	missions,
	selectedMissionId,
	onSelectMission,
	isLoading,
	className,
}: MissionsListProps) {
	if (isLoading) {
		return <MissionsListSkeleton className={className} />;
	}

	if (missions.length === 0) {
		return <MissionsListEmpty className={className} />;
	}

	return (
		<Card className={cn("overflow-hidden", className)} data-testid="missions-list">
			<CardContent className="p-0">
				{/* Compact card layout - no horizontal scroll */}
				<div className="divide-y">
					{missions.map((mission) => (
						<MissionRow
							key={mission.id}
							mission={mission}
							isSelected={mission.id === selectedMissionId}
							onSelect={onSelectMission}
						/>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function MissionsListSkeleton({ className }: { className?: string }) {
	return (
		<Card className={cn("flex-1", className)}>
			<CardContent className="p-4 space-y-3">
				{[1, 2, 3, 4, 5].map((i) => (
					<div key={i} className="flex items-center gap-4">
						<Skeleton className="h-10 w-20" />
						<Skeleton className="h-10 flex-1" />
						<Skeleton className="h-10 w-32" />
						<Skeleton className="h-10 w-24" />
						<Skeleton className="h-6 w-20" />
					</div>
				))}
			</CardContent>
		</Card>
	);
}

function MissionsListEmpty({ className }: { className?: string }) {
	const t = useTranslations("dispatch.missions.empty");

	return (
		<Card className={cn("flex-1", className)} data-testid="missions-list-empty">
			<CardContent className="py-16">
				<div className="text-center text-muted-foreground">
					<MapIcon className="size-12 mx-auto mb-4 opacity-50" />
					<p className="text-lg font-medium">{t("title")}</p>
					<p className="text-sm mt-1">{t("description")}</p>
				</div>
			</CardContent>
		</Card>
	);
}

export default MissionsList;
