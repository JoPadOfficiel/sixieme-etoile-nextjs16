"use client";

import { BasesTable, BaseDrawer } from "@saas/fleet/components";
import type { OperatingBaseWithCount } from "@saas/fleet/types";
import { useState, useCallback, Suspense, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { apiClient } from "@shared/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@ui/hooks/use-toast";

/**
 * Story 25.5: Deep Linking Navigation for Operating Bases
 * 
 * URL Query Parameters:
 * - `id`: Base ID to open in drawer
 * 
 * Example: /fleet/bases?id=abc123
 */

function BasesPageContent() {
  const t = useTranslations();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Story 25.5: Read URL params for deep linking
  const urlBaseId = searchParams.get("id");
  
  // Local state for manual drawer control
  const [manuallySelectedBase, setManuallySelectedBase] = useState<OperatingBaseWithCount | null>(null);
  const [isManualDrawerOpen, setIsManualDrawerOpen] = useState(false);

  // Fetch specific base if URL has id param (for deep linking)
  const { data: deepLinkBase, isLoading: isLoadingDeepLink, isError: isDeepLinkError } = useQuery({
    queryKey: ["operating-base", urlBaseId],
    queryFn: async () => {
      if (!urlBaseId) return null;
      // Note: Assuming endpoint exists and matches pattern
      const response = await apiClient.vtc.bases[":id"].$get({
        param: { id: urlBaseId },
      });
      if (!response.ok) {
        throw new Error("Base not found");
      }
      return response.json() as Promise<OperatingBaseWithCount>;
    },
    enabled: !!urlBaseId,
    retry: false,
  });

  // Show error toast and clear URL when deep link base not found
  useEffect(() => {
    if (isDeepLinkError && urlBaseId) {
      toast({
        title: t("fleet.bases.loadError"),
        description: `Base ID: ${urlBaseId}`,
        variant: "error",
      });
      router.replace(pathname, { scroll: false });
    }
  }, [isDeepLinkError, urlBaseId, toast, t, router, pathname]);

  // Derive drawer state from URL or manual control
  const isDeepLinkActive = !!urlBaseId && !!deepLinkBase && !isLoadingDeepLink;
  const drawerOpen = isDeepLinkActive || isManualDrawerOpen;
  const selectedBase = isDeepLinkActive ? deepLinkBase : manuallySelectedBase;

  // Update URL
  const updateUrl = useCallback((baseId: string | null) => {
    const params = new URLSearchParams();
    if (baseId) {
      params.set("id", baseId);
    }
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [pathname, router]);

  const handleAddBase = () => {
    updateUrl(null);
    setManuallySelectedBase(null);
    setIsManualDrawerOpen(true);
  };

  const handleEditBase = (base: OperatingBaseWithCount) => {
    updateUrl(base.id);
    setManuallySelectedBase(base);
    setIsManualDrawerOpen(true);
  };

  const handleDrawerOpenChange = (open: boolean) => {
    if (!open) {
      updateUrl(null);
      setManuallySelectedBase(null);
      setIsManualDrawerOpen(false);
    }
  };

  return (
    <div className="py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("fleet.bases.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("fleet.bases.description")}</p>
      </div>

      <BasesTable
        onAddBase={handleAddBase}
        onEditBase={handleEditBase}
      />

      <BaseDrawer
        open={drawerOpen}
        onOpenChange={handleDrawerOpenChange}
        base={selectedBase}
      />
    </div>
  );
}

// Wrap in Suspense for useSearchParams
export default function BasesPage() {
  return (
    <Suspense fallback={
      <div className="py-8 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded mb-4" />
        <div className="h-4 w-64 bg-muted rounded mb-8" />
        <div className="h-64 w-full bg-muted rounded" />
      </div>
    }>
      <BasesPageContent />
    </Suspense>
  );
}
