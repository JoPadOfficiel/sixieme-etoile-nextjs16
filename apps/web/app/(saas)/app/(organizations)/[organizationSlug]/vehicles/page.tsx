"use client";

import { VehiclesTable, VehicleDrawer } from "@saas/fleet/components";
import type { VehicleWithRelations } from "@saas/fleet/types";
import { useState, useCallback, Suspense, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { apiClient } from "@shared/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@ui/hooks/use-toast";

/**
 * Story 25.5: Deep Linking Navigation for Vehicles
 * 
 * URL Query Parameters:
 * - `id`: Vehicle ID to open in drawer
 * 
 * Example: /vehicles?id=abc123
 */

function VehiclesPageContent() {
  const t = useTranslations();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Story 25.5: Read URL params for deep linking
  const urlVehicleId = searchParams.get("id");
  
  // Local state for manual drawer control
  const [manuallySelectedVehicle, setManuallySelectedVehicle] = useState<VehicleWithRelations | null>(null);
  const [isManualDrawerOpen, setIsManualDrawerOpen] = useState(false);

  // Fetch specific vehicle if URL has id param (for deep linking)
  const { data: deepLinkVehicle, isLoading: isLoadingDeepLink, isError: isDeepLinkError } = useQuery({
    queryKey: ["vehicle", urlVehicleId],
    queryFn: async () => {
      if (!urlVehicleId) return null;
      const response = await apiClient.vtc.vehicles[":id"].$get({
        param: { id: urlVehicleId },
      });
      if (!response.ok) {
        throw new Error("Vehicle not found");
      }
      return response.json() as Promise<VehicleWithRelations>;
    },
    enabled: !!urlVehicleId,
    retry: false,
  });

  // Show error toast and clear URL when deep link vehicle not found
  useEffect(() => {
    if (isDeepLinkError && urlVehicleId) {
      toast({
        title: t("fleet.vehicles.loadError"),
        description: `Vehicle ID: ${urlVehicleId}`,
        variant: "error",
      });
      router.replace(pathname, { scroll: false });
    }
  }, [isDeepLinkError, urlVehicleId, toast, t, router, pathname]);

  // Derive drawer state from URL or manual control
  const isDeepLinkActive = !!urlVehicleId && !!deepLinkVehicle && !isLoadingDeepLink;
  const drawerOpen = isDeepLinkActive || isManualDrawerOpen;
  const selectedVehicle = isDeepLinkActive ? deepLinkVehicle : manuallySelectedVehicle;

  // Update URL
  const updateUrl = useCallback((vehicleId: string | null) => {
    const params = new URLSearchParams();
    if (vehicleId) {
      params.set("id", vehicleId);
    }
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [pathname, router]);

  const handleAddVehicle = () => {
    updateUrl(null);
    setManuallySelectedVehicle(null);
    setIsManualDrawerOpen(true);
  };

  const handleEditVehicle = (vehicle: VehicleWithRelations) => {
    updateUrl(vehicle.id);
    setManuallySelectedVehicle(vehicle);
    setIsManualDrawerOpen(true);
  };

  const handleDrawerOpenChange = (open: boolean) => {
    if (!open) {
      updateUrl(null);
      setManuallySelectedVehicle(null);
      setIsManualDrawerOpen(false);
    }
  };

  return (
    <div className="py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("fleet.vehicles.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("fleet.vehicles.description")}</p>
      </div>

      <VehiclesTable
        onAddVehicle={handleAddVehicle}
        onEditVehicle={handleEditVehicle}
      />

      <VehicleDrawer
        open={drawerOpen}
        onOpenChange={handleDrawerOpenChange}
        vehicle={selectedVehicle}
      />
    </div>
  );
}

// Wrap in Suspense for useSearchParams
export default function VehiclesPage() {
  return (
    <Suspense fallback={
      <div className="py-8 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded mb-4" />
        <div className="h-4 w-64 bg-muted rounded mb-8" />
        <div className="h-64 w-full bg-muted rounded" />
      </div>
    }>
      <VehiclesPageContent />
    </Suspense>
  );
}
