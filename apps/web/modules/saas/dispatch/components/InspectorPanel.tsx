"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
} from "@ui/components/sheet";
import { Button } from "@ui/components/button";
import { Skeleton } from "@ui/components/skeleton";
import { Badge } from "@ui/components/badge";
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
import { useMissionDetail } from "../hooks/useMissions";
import { useMissionActions } from "../hooks/useMissionActions";
import { EditIcon, XCircleIcon, UserMinusIcon } from "lucide-react";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";

// Sub-components
import { TripTransparencyPanel } from "@saas/quotes/components/TripTransparencyPanel";
import { MissionContactPanel } from "./MissionContactPanel";
import { VehicleAssignmentPanel } from "./VehicleAssignmentPanel";
import { StaffingCostsSection } from "./StaffingCostsSection";
import type { MissionDetail } from "../types";
import type { PricingResult } from "@saas/quotes/types";

interface InspectorPanelProps {
  missionId: string | null;
  onClose: () => void;
  onOpenAssignment?: () => void;
}

export function InspectorPanel({ missionId, onClose, onOpenAssignment }: InspectorPanelProps) {
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
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto sm:max-w-none">
        
        {isLoading ? (
          <div className="space-y-4 mt-6">
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
                 <Badge variant={mission.status === "ACCEPTED" ? "default" : "secondary"}>
                    {mission.status}
                 </Badge>
               </div>
               <SheetDescription>
                  {missionId ? `#${missionId.substring(0, 8)}` : ""}
               </SheetDescription>
            </SheetHeader>

            {/* Actions Bar */}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={handleEditRoute}>
                <EditIcon className="size-3.5 mr-2" />
                {t("editRoute")}
              </Button>
              
              {mission.assignment?.driverId || mission.assignment?.vehicleId ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700">
                      <UserMinusIcon className="size-3.5 mr-2" />
                      {t("unassign")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("confirmUnassignTitle")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("confirmUnassignDescription")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleUnassign} className="bg-orange-600 hover:bg-orange-700">
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

            <MissionContactPanel
                mission={mission}
                isLoading={isLoading}
            />

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
            <div className="pt-6 border-t">
               <AlertDialog>
                <AlertDialogTrigger asChild>
                   <Button variant="destructive" className="w-full">
                    <XCircleIcon className="size-4 mr-2" />
                    {t("cancelMission")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                   <AlertDialogHeader>
                      <AlertDialogTitle>{t("confirmCancelTitle")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("confirmCancelDescription")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancel} className="bg-destructive hover:bg-destructive/90">
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
                <div className="text-center py-10 text-muted-foreground">
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
