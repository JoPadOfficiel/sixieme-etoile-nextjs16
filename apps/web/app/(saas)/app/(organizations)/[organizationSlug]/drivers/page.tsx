"use client";

import { DriversTable, DriverDrawer, type DriverTab } from "@saas/fleet/components";
import type { DriverWithLicenses } from "@saas/fleet/types";
import { useState, useCallback, Suspense, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { apiClient } from "@shared/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@ui/hooks/use-toast";

/**
 * Story 25.5: Deep Linking Navigation for Drivers
 * 
 * URL Query Parameters:
 * - `id`: Driver ID to open in drawer
 * - `tab`: Tab to display (details, calendar, compliance)
 * 
 * Example: /drivers?id=abc123&tab=calendar
 */

// Valid tabs for URL validation
const VALID_TABS: DriverTab[] = ["details", "calendar", "compliance"];

function isValidTab(tab: string | null): tab is DriverTab {
  return tab !== null && VALID_TABS.includes(tab as DriverTab);
}

function DriversPageContent() {
  const t = useTranslations();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Story 25.5: Read URL params for deep linking
  const urlDriverId = searchParams.get("id");
  const urlTab = searchParams.get("tab");
  
  // Derive initial tab from URL
  const derivedInitialTab = useMemo<DriverTab>(() => {
    if (isValidTab(urlTab)) {
      return urlTab;
    }
    if (urlTab !== null) {
      console.warn(`[Deep Linking] Invalid tab parameter: "${urlTab}". Valid tabs: ${VALID_TABS.join(", ")}. Defaulting to "details".`);
    }
    return "details";
  }, [urlTab]);
  
  // Local state for manual drawer control
  const [manuallySelectedDriver, setManuallySelectedDriver] = useState<DriverWithLicenses | null>(null);
  const [isManualDrawerOpen, setIsManualDrawerOpen] = useState(false);
  const [manualTab, setManualTab] = useState<DriverTab>("details");

  // Fetch specific driver if URL has id param (for deep linking)
  const { data: deepLinkDriver, isLoading: isLoadingDeepLink, isError: isDeepLinkError } = useQuery({
    queryKey: ["driver", urlDriverId],
    queryFn: async () => {
      if (!urlDriverId) return null;
      const response = await apiClient.vtc.drivers[":id"].$get({
        param: { id: urlDriverId },
      });
      if (!response.ok) {
        throw new Error("Driver not found");
      }
      return response.json() as Promise<DriverWithLicenses>;
    },
    enabled: !!urlDriverId,
    retry: false,
  });

  // Show error toast and clear URL when deep link driver not found
  useEffect(() => {
    if (isDeepLinkError && urlDriverId) {
      toast({
        title: t("fleet.drivers.loadError"),
        description: `Driver ID: ${urlDriverId}`,
        variant: "error",
      });
      // Clear the invalid URL params
      router.replace(pathname, { scroll: false });
    }
  }, [isDeepLinkError, urlDriverId, toast, t, router, pathname]);

  // Derive drawer state from URL or manual control
  const isDeepLinkActive = !!urlDriverId && !!deepLinkDriver && !isLoadingDeepLink;
  const drawerOpen = isDeepLinkActive || isManualDrawerOpen;
  const selectedDriver = isDeepLinkActive ? deepLinkDriver : manuallySelectedDriver;
  const currentTab = isDeepLinkActive ? derivedInitialTab : manualTab;

  // Update URL when drawer/tab changes
  const updateUrl = useCallback((driverId: string | null, tab: DriverTab | null) => {
    const params = new URLSearchParams();
    if (driverId) {
      params.set("id", driverId);
      if (tab && tab !== "details") {
        params.set("tab", tab);
      }
    }
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [pathname, router]);

  const handleAddDriver = () => {
    updateUrl(null, null);
    setManuallySelectedDriver(null);
    setManualTab("details");
    setIsManualDrawerOpen(true);
  };

  const handleEditDriver = (driver: DriverWithLicenses) => {
    updateUrl(driver.id, "details");
    setManuallySelectedDriver(driver);
    setManualTab("details");
    setIsManualDrawerOpen(true);
  };

  const handleDrawerOpenChange = (open: boolean) => {
    if (!open) {
      updateUrl(null, null);
      setManuallySelectedDriver(null);
      setManualTab("details");
      setIsManualDrawerOpen(false);
    }
  };

  const handleTabChange = (tab: DriverTab) => {
    setManualTab(tab);
    if (selectedDriver) {
      updateUrl(selectedDriver.id, tab);
    }
  };

  return (
    <div className="py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("fleet.drivers.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("fleet.drivers.description")}</p>
      </div>

      <DriversTable
        onAddDriver={handleAddDriver}
        onEditDriver={handleEditDriver}
      />

      <DriverDrawer
        open={drawerOpen}
        onOpenChange={handleDrawerOpenChange}
        driver={selectedDriver}
        initialTab={currentTab}
        onTabChange={handleTabChange}
      />
    </div>
  );
}

// Wrap in Suspense for useSearchParams
export default function DriversPage() {
  return (
    <Suspense fallback={
      <div className="py-8 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded mb-4" />
        <div className="h-4 w-64 bg-muted rounded mb-8" />
        <div className="h-64 w-full bg-muted rounded" />
      </div>
    }>
      <DriversPageContent />
    </Suspense>
  );
}
