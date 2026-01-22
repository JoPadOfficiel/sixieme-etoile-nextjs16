"use client";

import { Button } from "@ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Badge } from "@ui/components/badge";
import { Skeleton } from "@ui/components/skeleton";
import { Car, User, MapPin, UserPlus, Building2, Phone, Euro, Calendar, Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { cn } from "@ui/lib";
import type { MissionAssignment, MissionSubcontractor } from "../types";
import { useMissionOrder } from "../hooks/useMissionOrder";

/**
 * VehicleAssignmentPanel Component
 *
 * Story 8.1: Implement Dispatch Screen Layout
 * Story 22.12: Display subcontractor info when mission is subcontracted
 *
 * Shows current vehicle/driver assignment for a selected mission.
 * When subcontracted, shows subcontractor details instead of internal assignment.
 *
 * @see AC6: Vehicle Assignment Panel Display
 */

interface VehicleAssignmentPanelProps {
	assignment: MissionAssignment | null;
	isSubcontracted?: boolean;
	subcontractor?: MissionSubcontractor | null;
	isLoading?: boolean;
	onAssign?: () => void;
	onChangeSubcontractor?: () => void;
	onRemoveSubcontractor?: () => void;
	className?: string;
	// Story 25.1: Quote ID for generating mission sheet (legacy)
	quoteId?: string | null;
	// Story 29.8: Mission ID for generating per-mission sheet
	missionId?: string | null;
}

export function VehicleAssignmentPanel({
	assignment,
	isSubcontracted = false,
	subcontractor,
	isLoading = false,
	onAssign,
	onChangeSubcontractor,
	onRemoveSubcontractor,
	className,
	quoteId,
	missionId,
}: VehicleAssignmentPanelProps) {
	const t = useTranslations("dispatch.assignment");
	const { generateMissionOrder, isGenerating, generateMissionSheet, isGeneratingSheet } = useMissionOrder();

	if (isLoading) {
		return <VehicleAssignmentPanelSkeleton className={className} />;
	}

	const isAssigned = assignment?.vehicleId !== null;

	// Story 22.12: If subcontracted, show subcontractor info instead of internal assignment
	if (isSubcontracted && subcontractor) {
		return (
			<Card className={cn("border-purple-200 bg-purple-50/50 dark:bg-purple-950/20", className)} data-testid="vehicle-assignment-panel">
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<CardTitle className="text-base font-semibold">{t("title")}</CardTitle>
							<Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
								<Building2 className="size-3 mr-1" />
								{t("subcontracted")}
							</Badge>
						</div>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={onChangeSubcontractor}
								disabled={!onChangeSubcontractor}
							>
								<Building2 className="size-4 mr-1" />
								Assigner Subcontract
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={onRemoveSubcontractor}
								disabled={!onRemoveSubcontractor}
							>
								<UserPlus className="size-4 mr-1" />
								Assigner
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{/* Subcontractor Company */}
						<div className="flex items-start gap-3">
							<div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-md">
								<Building2 className="size-4 text-purple-600" />
							</div>
							<div className="flex-1">
								<div className="text-sm font-medium">{t("subcontractorCompany")}</div>
								<div className="text-sm font-semibold text-purple-700 dark:text-purple-400">
									{subcontractor.companyName}
								</div>
								{subcontractor.contactName && (
									<div className="text-xs text-muted-foreground">
										{subcontractor.contactName}
									</div>
								)}
							</div>
						</div>

						{/* Phone */}
						{subcontractor.phone && (
							<div className="flex items-start gap-3">
								<div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-md">
									<Phone className="size-4 text-purple-600" />
								</div>
								<div className="flex-1">
									<div className="text-sm font-medium">{t("phone")}</div>
									<a
										href={`tel:${subcontractor.phone}`}
										className="text-sm text-purple-600 hover:underline"
									>
										{subcontractor.phone}
									</a>
								</div>
							</div>
						)}

						{/* Agreed Price */}
						<div className="flex items-start gap-3">
							<div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-md">
								<Euro className="size-4 text-purple-600" />
							</div>
							<div className="flex-1">
								<div className="text-sm font-medium">{t("agreedPrice")}</div>
								<div className="text-sm font-semibold text-purple-700 dark:text-purple-400">
									{subcontractor.agreedPrice.toFixed(2)} €
								</div>
							</div>
						</div>

						{/* Subcontracted Date */}
						<div className="flex items-start gap-3">
							<div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-md">
								<Calendar className="size-4 text-purple-600" />
							</div>
							<div className="flex-1">
								<div className="text-sm font-medium">{t("subcontractedAt")}</div>
								<div className="text-sm text-muted-foreground">
									{format(new Date(subcontractor.subcontractedAt), "dd/MM/yyyy HH:mm")}
								</div>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

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

					{/* Story 29.8: Print Mission Sheet button - prefer missionId (per-mission) over quoteId (legacy) */}
					{assignment.driverId && (missionId || quoteId) && (
						<div className="pt-2 border-t">
							<Button
								variant="outline"
								size="sm"
								className="w-full"
								onClick={() => {
									if (missionId) {
										generateMissionSheet(missionId);
									} else if (quoteId) {
										generateMissionOrder(quoteId);
									}
								}}
								disabled={isGenerating || isGeneratingSheet}
							>
								<Printer className="size-4 mr-2" />
								{t("printMissionSheet")}
							</Button>
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
