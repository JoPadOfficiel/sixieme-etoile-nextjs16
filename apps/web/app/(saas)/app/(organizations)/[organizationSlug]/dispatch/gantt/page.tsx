"use client";

/**
 * Gantt Timeline Test Page
 *
 * Story 27.3: Gantt Core Timeline Rendering
 *
 * Test page for the Gantt timeline visualization component.
 * Access at: /app/{organizationSlug}/dispatch/gantt
 */

import { useMemo } from "react";
import { addHours, startOfDay } from "date-fns";
import { GanttTimeline } from "@saas/dispatch/components/gantt";
import { useDriversForGantt } from "@saas/dispatch/hooks/useDriversForGantt";
import { Skeleton } from "@ui/components/skeleton";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function GanttTestPage() {
	const params = useParams();
	const organizationSlug = params.organizationSlug as string;

	// Calculate time range: today from 6:00 to 22:00 + tomorrow
	const { startTime, endTime } = useMemo(() => {
		const today = startOfDay(new Date());
		const start = addHours(today, 6); // Start at 6:00
		const end = addHours(today, 46); // End at 22:00 tomorrow (6 + 40h)
		return { startTime: start, endTime: end };
	}, []);

	// Fetch drivers
	const { drivers, isLoading, error } = useDriversForGantt({
		startTime,
		endTime,
	});

	return (
		<div className="flex flex-col h-screen p-4">
			{/* Header */}
			<div className="flex items-center gap-4 mb-4">
				<Link
					href={`/app/${organizationSlug}/dispatch`}
					className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
				>
					<ArrowLeft className="w-5 h-5" />
				</Link>
				<div>
					<h1 className="text-2xl font-bold">Planning Chauffeurs</h1>
					<p className="text-sm text-muted-foreground">
						Vue Gantt - Story 27.3 Test
					</p>
				</div>
			</div>

			{/* Gantt Timeline */}
			<div className="flex-1 min-h-0">
				{isLoading ? (
					<div className="space-y-4">
						<Skeleton className="h-12 w-full" />
						<Skeleton className="h-64 w-full" />
					</div>
				) : error ? (
					<div className="flex items-center justify-center h-full">
						<div className="text-center">
							<p className="text-red-500 mb-2">Erreur de chargement</p>
							<p className="text-sm text-muted-foreground">{error.message}</p>
						</div>
					</div>
				) : (
					<GanttTimeline
						drivers={drivers}
						startTime={startTime}
						endTime={endTime}
						pixelsPerHour={60}
						onDriverClick={(driverId) => {
							console.log("Driver clicked:", driverId);
						}}
						onMissionClick={(missionId) => {
							console.log("Mission clicked:", missionId);
						}}
						className="h-full"
					/>
				)}
			</div>
		</div>
	);
}
