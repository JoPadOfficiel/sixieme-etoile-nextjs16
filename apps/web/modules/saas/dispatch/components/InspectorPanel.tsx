"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@ui/components/alert-dialog";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@ui/components/sheet";
import { Skeleton } from "@ui/components/skeleton";
import { EditIcon, UserMinusIcon, XCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMissionActions } from "../hooks/useMissionActions";
import { useMissionDetail } from "../hooks/useMissions";

// Sub-components
import { TripTransparencyPanel } from "@saas/quotes/components/TripTransparencyPanel";
import type { PricingResult } from "@saas/quotes/types";
import type { MissionDetail } from "../types";
import { MissionContactPanel } from "./MissionContactPanel";
import { StaffingCostsSection } from "./StaffingCostsSection";
import { VehicleAssignmentPanel } from "./VehicleAssignmentPanel";

interface InspectorPanelProps {
	missionId: string | null;
	onClose: () => void;
	onOpenAssignment?: () => void;
}

export function InspectorPanel({
	missionId,
	onClose,
	onOpenAssignment,
}: InspectorPanelProps) {
	const t = useTranslations("dispatch.inspector");
	const router = useRouter();
	const { activeOrganization } = useActiveOrganization();
	const { data: mission, isLoading } = useMissionDetail({ missionId });

	const { unassign, cancel, isUnassigning, isCancelling } = useMissionActions({
		onUnassignSuccess: () => {
			onClose();
		},
		onCancelSuccess: () => {
			onClose();
		},
	});

	const handleEditRoute = () => {
		if (mission && activeOrganization) {
			router.push(`/app/${activeOrganization.slug}/quotes/${mission.id}/edit`);
		}
	};

	const handleUnassign = () => {
		if (missionId) {
			unassign(missionId);
		}
	};

	const handleCancel = () => {
		if (missionId) {
			cancel(missionId);
		}
	};

	const isOpen = !!missionId;

	// Transform mission to pricing result for TripTransparencyPanel
	const pricingResult = mission ? missionToPricingResult(mission) : null;

	return (
		<Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<SheetContent className="sm:!max-w-none sm:!w-full lg:!max-w-[35vw] lg:!w-[35vw] w-full overflow-y-auto">
				{isLoading ? (
					<div className="mt-6 space-y-4">
						<SheetHeader className="sr-only">
							<SheetTitle>{t("title")}</SheetTitle>
							<SheetDescription>{t("loading")}</SheetDescription>
						</SheetHeader>
						<Skeleton className="h-8 w-1/2" />
						<Skeleton className="h-4 w-1/3" />
						<Skeleton className="h-64 w-full" />
						<Skeleton className="h-32 w-full" />
					</div>
				) : mission ? (
					<div className="space-y-6 pb-10">
						<SheetHeader>
							<div className="flex items-center justify-between">
								<SheetTitle>{t("title")}</SheetTitle>
								<Badge
									variant={
										(mission as any).status === "ACCEPTED"
											? "default"
											: "secondary"
									}
								>
									{(mission as any).status}
								</Badge>
							</div>
							<SheetDescription>
								{missionId ? `#${missionId.substring(0, 8)}` : ""}
							</SheetDescription>
						</SheetHeader>

						{/* Actions Bar */}
						<div className="grid grid-cols-2 gap-2">
							<Button variant="outline" size="sm" onClick={handleEditRoute}>
								<EditIcon className="mr-2 size-3.5" />
								{t("editRoute")}
							</Button>

							{mission.assignment?.driverId || mission.assignment?.vehicleId ? (
								<AlertDialog>
									<AlertDialogTrigger asChild>
										<Button
											variant="outline"
											size="sm"
											className="border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
										>
											<UserMinusIcon className="mr-2 size-3.5" />
											{t("unassign")}
										</Button>
									</AlertDialogTrigger>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>
												{t("confirmUnassignTitle")}
											</AlertDialogTitle>
											<AlertDialogDescription>
												{t("confirmUnassignDescription")}
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
											<AlertDialogAction
												onClick={handleUnassign}
												className="bg-orange-600 hover:bg-orange-700"
											>
												{isUnassigning ? t("processing") : t("confirmUnassign")}
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							) : (
								<div /> // Spacer
							)}
						</div>

						{/* Mission Details Panels */}

						<TripTransparencyPanel
							pricingResult={pricingResult}
							isLoading={isLoading}
						/>

						<MissionContactPanel mission={mission} isLoading={isLoading} />

						<VehicleAssignmentPanel
							assignment={mission.assignment || null}
							isSubcontracted={mission.isSubcontracted ?? false}
							subcontractor={mission.subcontractor ?? null}
							isLoading={isLoading}
							onAssign={
								mission && !mission.isSubcontracted
									? onOpenAssignment
									: undefined
							}
							quoteId={mission.quoteId}
						/>

						<StaffingCostsSection
							tripAnalysis={mission.tripAnalysis ?? null}
							isLoading={isLoading}
						/>

						{/* Default Cancel Action at bottom */}
						<div className="border-t pt-6">
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button variant="destructive" className="w-full">
										<XCircleIcon className="mr-2 size-4" />
										{t("cancelMission")}
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>
											{t("confirmCancelTitle")}
										</AlertDialogTitle>
										<AlertDialogDescription>
											{t("confirmCancelDescription")}
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
										<AlertDialogAction
											onClick={handleCancel}
											className="bg-destructive hover:bg-destructive/90"
										>
											{isCancelling ? t("processing") : t("confirmCancel")}
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</div>
					</div>
				) : (
					<>
						<SheetHeader className="sr-only">
							<SheetTitle>{t("title")}</SheetTitle>
							<SheetDescription>{t("missionNotFound")}</SheetDescription>
						</SheetHeader>
						<div className="py-10 text-center text-muted-foreground">
							{t("missionNotFound")}
						</div>
					</>
				)}
			</SheetContent>
		</Sheet>
	);
}

// Helper to convert mission to pricing result (Same as in DispatchPage)
function missionToPricingResult(mission: MissionDetail): PricingResult | null {
	if (!mission.tripAnalysis) return null;

	const tripAnalysis = mission.tripAnalysis as Record<string, unknown>;
	const num = (v: unknown) => (typeof v === "number" ? v : 0);

	return {
		price: mission.finalPrice,
		internalCost: mission.internalCost || 0,
		marginPercent: mission.marginPercent || 0,
		pricingMode: mission.pricingMode,
		tripAnalysis: {
			totalDistanceKm: num(tripAnalysis.totalDistanceKm),
			totalDurationMinutes: num(tripAnalysis.totalDurationMinutes),
			totalInternalCost:
				num(tripAnalysis.totalInternalCost) || mission.internalCost || 0,
			routingSource: (tripAnalysis.routingSource as string) || "ESTIMATE",
			segments: (tripAnalysis.segments as Record<string, unknown>) || {},
			costBreakdown:
				(tripAnalysis.costBreakdown as Record<string, unknown>) || {},
			vehicleSelection: tripAnalysis.vehicleSelection as
				| Record<string, unknown>
				| undefined,
		},
		matchedGrid: null,
		appliedRules: [],
		complianceResult:
			(tripAnalysis.complianceResult as Record<string, unknown>) || null,
	} as unknown as PricingResult;
}
