"use client";

import { Button } from "@ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Badge } from "@ui/components/badge";
import { Skeleton } from "@ui/components/skeleton";
import { Car, User, MapPin, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";
import type { MissionAssignment } from "../types";

/**
 * VehicleAssignmentPanel Component
 *
 * Story 8.1: Implement Dispatch Screen Layout
 *
 * Shows current vehicle/driver assignment for a selected mission.
 * The "Assign" button is disabled for now (Story 8.2 will implement the drawer).
 *
 * @see AC6: Vehicle Assignment Panel Display
 */

interface VehicleAssignmentPanelProps {
	assignment: MissionAssignment | null;
	isLoading?: boolean;
	onAssign?: () => void;
	className?: string;
}

export function VehicleAssignmentPanel({
	assignment,
	isLoading = false,
	onAssign,
	className,
}: VehicleAssignmentPanelProps) {
	const t = useTranslations("dispatch.assignment");

	if (isLoading) {
		return <VehicleAssignmentPanelSkeleton className={className} />;
	}

	const isAssigned = assignment?.vehicleId !== null;

	return (
		<Card className={cn("", className)} data-testid="vehicle-assignment-panel">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-base font-semibold">{t("title")}</CardTitle>
					<Button
						variant={isAssigned ? "outline" : "default"}
						size="sm"
						onClick={onAssign}
						disabled={!onAssign}
					>
						<UserPlus className="size-4 mr-1" />
						{isAssigned ? t("changeButton") : t("assignButton")}
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				{isAssigned && assignment ? (
					<div className="space-y-3">
						{/* Vehicle */}
						<div className="flex items-start gap-3">
							<div className="p-2 bg-muted rounded-md">
								<Car className="size-4 text-muted-foreground" />
							</div>
							<div className="flex-1">
								<div className="text-sm font-medium">{t("vehicle")}</div>
								<div className="text-sm text-muted-foreground">
									{assignment.vehicleName || "-"}
								</div>
							</div>
						</div>

						{/* Driver */}
						<div className="flex items-start gap-3">
							<div className="p-2 bg-muted rounded-md">
								<User className="size-4 text-muted-foreground" />
							</div>
							<div className="flex-1">
								<div className="text-sm font-medium">{t("driver")}</div>
								<div className="text-sm text-muted-foreground">
									{assignment.driverName || t("unassigned")}
								</div>
								{/* Story 20.8: Display second driver if assigned */}
								{assignment.secondDriverName && (
									<div className="text-sm text-muted-foreground mt-1">
										{t("secondDriver")}: {assignment.secondDriverName}
									</div>
								)}
							</div>
						</div>

						{/* Base */}
						{assignment.baseName && (
							<div className="flex items-start gap-3">
								<div className="p-2 bg-muted rounded-md">
									<MapPin className="size-4 text-muted-foreground" />
								</div>
								<div className="flex-1">
									<div className="text-sm font-medium">{t("base")}</div>
									<div className="text-sm text-muted-foreground">
										{assignment.baseName}
									</div>
								</div>
							</div>
						)}
					</div>
				) : (
					<div className="text-center py-4">
						<Badge variant="secondary" className="mb-2">
							<UserPlus className="size-3 mr-1" />
							{t("unassigned")}
						</Badge>
						<p className="text-sm text-muted-foreground">
							{t("unassignedDescription")}
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function VehicleAssignmentPanelSkeleton({ className }: { className?: string }) {
	return (
		<Card className={cn("", className)}>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<Skeleton className="h-5 w-24" />
					<Skeleton className="h-8 w-20" />
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				{[1, 2, 3].map((i) => (
					<div key={i} className="flex items-start gap-3">
						<Skeleton className="h-8 w-8 rounded-md" />
						<div className="flex-1 space-y-1">
							<Skeleton className="h-4 w-16" />
							<Skeleton className="h-4 w-24" />
						</div>
					</div>
				))}
			</CardContent>
		</Card>
	);
}

export default VehicleAssignmentPanel;
