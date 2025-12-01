"use client";

/**
 * Story 14.6: Partner Assignment Dialog
 * 
 * A reusable dialog for assigning rate grids (routes, excursions, dispos)
 * to partners with optional override prices.
 */

import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ui/components/dialog";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { useToast } from "@ui/hooks/use-toast";
import { apiClient } from "@shared/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2Icon,
  SearchIcon,
  UsersIcon,
  Building2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useEffect, useMemo, useRef } from "react";

// Types
interface Partner {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  hasContract: boolean;
  commissionPercent: number | null;
}

interface Assignment {
  id?: string;
  contactId: string;
  contactName: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  overridePrice: number | null;
  catalogPrice: number;
  effectivePrice: number;
}

interface PartnerAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemType: "route" | "excursion" | "dispo";
  catalogPrice: number;
  itemLabel: string; // e.g., "Paris → CDG" or "Journée Versailles"
  onSuccess?: () => void;
}

// Local state for assignment editing
interface LocalAssignment {
  contactId: string;
  selected: boolean;
  overridePrice: number | null;
  useOverride: boolean;
}

export function PartnerAssignmentDialog({
  open,
  onOpenChange,
  itemId,
  itemType,
  catalogPrice,
  itemLabel,
  onSuccess,
}: PartnerAssignmentDialogProps) {
  const t = useTranslations("routes.partnerAssignment");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [localAssignments, setLocalAssignments] = useState<Map<string, LocalAssignment>>(new Map());

  // Build API paths based on item type
  const getApiPath = () => {
    switch (itemType) {
      case "route":
        return `pricing/routes/${itemId}/partner-assignments`;
      case "excursion":
        return `pricing/excursions/${itemId}/partner-assignments`;
      case "dispo":
        return `pricing/dispos/${itemId}/partner-assignments`;
    }
  };

  // Fetch all partners
  const { data: partnersData, isLoading: isLoadingPartners } = useQuery({
    queryKey: ["partners"],
    queryFn: async () => {
      const response = await apiClient.vtc.partners.$get();
      if (!response.ok) throw new Error("Failed to fetch partners");
      return response.json() as Promise<{ partners: Partner[]; total: number }>;
    },
    enabled: open,
  });

  // Fetch current assignments
  const { data: assignmentsData, isLoading: isLoadingAssignments } = useQuery({
    queryKey: ["partner-assignments", itemType, itemId],
    queryFn: async () => {
      const path = getApiPath();
      const response = await fetch(`/api/vtc/${path}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch assignments");
      return response.json() as Promise<{
        assignments: Assignment[];
        catalogPrice: number;
        totalPartners: number;
      }>;
    },
    enabled: open && !!itemId,
  });

  // Track previous data to detect changes
  const prevDataRef = useRef<{ partners: Partner[] | undefined; assignments: Assignment[] | undefined }>({
    partners: undefined,
    assignments: undefined,
  });
  
  // Initialize local state when data loads or dialog opens
  useEffect(() => {
    if (!open || !partnersData?.partners) return;
    
    // Check if data actually changed
    const partnersChanged = prevDataRef.current.partners !== partnersData.partners;
    const assignmentsChanged = prevDataRef.current.assignments !== assignmentsData?.assignments;
    
    if (!partnersChanged && !assignmentsChanged && localAssignments.size > 0) return;
    
    prevDataRef.current = {
      partners: partnersData.partners,
      assignments: assignmentsData?.assignments,
    };
    
    const newMap = new Map<string, LocalAssignment>();
    
    for (const partner of partnersData.partners) {
      const existingAssignment = assignmentsData?.assignments.find(
        (a) => a.contactId === partner.id
      );
      
      newMap.set(partner.id, {
        contactId: partner.id,
        selected: !!existingAssignment,
        overridePrice: existingAssignment?.overridePrice ?? null,
        useOverride: existingAssignment?.overridePrice !== null,
      });
    }
    
    setLocalAssignments(newMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, partnersData?.partners, assignmentsData?.assignments]);
  
  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearch("");
      setLocalAssignments(new Map());
      prevDataRef.current = { partners: undefined, assignments: undefined };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const assignments = Array.from(localAssignments.values())
        .filter((a) => a.selected)
        .map((a) => ({
          contactId: a.contactId,
          overridePrice: a.useOverride ? a.overridePrice : null,
        }));

      const path = getApiPath();
      const response = await fetch(`/api/vtc/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ assignments }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save assignments");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({ title: t("saveSuccess") });
      queryClient.invalidateQueries({ queryKey: ["partner-assignments", itemType, itemId] });
      queryClient.invalidateQueries({ queryKey: ["partnerContract"] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast({ title: t("saveError"), description: error.message, variant: "destructive" });
    },
  });

  // Filter partners by search
  const filteredPartners = useMemo(() => {
    if (!partnersData?.partners) return [];
    if (!search.trim()) return partnersData.partners;
    
    const searchLower = search.toLowerCase();
    return partnersData.partners.filter(
      (p) =>
        p.displayName.toLowerCase().includes(searchLower) ||
        p.email?.toLowerCase().includes(searchLower)
    );
  }, [partnersData?.partners, search]);

  // Count selected partners
  const selectedCount = useMemo(() => {
    return Array.from(localAssignments.values()).filter((a) => a.selected).length;
  }, [localAssignments]);

  // Toggle partner selection
  const togglePartner = (partnerId: string) => {
    setLocalAssignments((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(partnerId);
      if (current) {
        newMap.set(partnerId, { ...current, selected: !current.selected });
      }
      return newMap;
    });
  };

  // Update override price
  const updateOverridePrice = (partnerId: string, price: number | null) => {
    setLocalAssignments((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(partnerId);
      if (current) {
        newMap.set(partnerId, { ...current, overridePrice: price, useOverride: price !== null });
      }
      return newMap;
    });
  };

  // Toggle use override
  const toggleUseOverride = (partnerId: string) => {
    setLocalAssignments((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(partnerId);
      if (current) {
        newMap.set(partnerId, {
          ...current,
          useOverride: !current.useOverride,
          overridePrice: !current.useOverride ? catalogPrice : null,
        });
      }
      return newMap;
    });
  };

  const isLoading = isLoadingPartners || isLoadingAssignments;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UsersIcon className="size-5" />
            {t("dialogTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("dialogDescription")}
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline">{itemLabel}</Badge>
              <Badge variant="secondary">{t("catalogPrice")}: {formatPrice(catalogPrice)}</Badge>
            </div>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : !partnersData?.partners.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Building2Icon className="size-12 text-muted-foreground/50 mb-4" />
            <p className="font-medium">{t("noPartners")}</p>
            <p className="text-sm text-muted-foreground">{t("noPartnersDescription")}</p>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Partners list */}
            <div className="flex-1 -mx-6 px-6 max-h-[400px] overflow-y-auto">
              <div className="space-y-2">
                {filteredPartners.map((partner) => {
                  const assignment = localAssignments.get(partner.id);
                  if (!assignment) return null;

                  return (
                    <div
                      key={partner.id}
                      className={`rounded-lg border p-4 transition-colors ${
                        assignment.selected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`partner-${partner.id}`}
                          checked={assignment.selected}
                          onCheckedChange={() => togglePartner(partner.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <Label
                            htmlFor={`partner-${partner.id}`}
                            className="font-medium cursor-pointer"
                          >
                            {partner.displayName}
                          </Label>
                          {partner.email && (
                            <p className="text-sm text-muted-foreground truncate">
                              {partner.email}
                            </p>
                          )}
                          {partner.commissionPercent !== null && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              {partner.commissionPercent}% commission
                            </Badge>
                          )}
                        </div>

                        {/* Override price controls - only show when selected */}
                        {assignment.selected && (
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`override-${partner.id}`}
                                checked={assignment.useOverride}
                                onCheckedChange={() => toggleUseOverride(partner.id)}
                              />
                              <Label
                                htmlFor={`override-${partner.id}`}
                                className="text-sm cursor-pointer"
                              >
                                {t("setOverridePrice")}
                              </Label>
                            </div>
                            {assignment.useOverride && (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  value={assignment.overridePrice ?? ""}
                                  onChange={(e) =>
                                    updateOverridePrice(
                                      partner.id,
                                      e.target.value ? parseFloat(e.target.value) : null
                                    )
                                  }
                                  className="w-24 text-right"
                                  placeholder="0.00"
                                />
                                <span className="text-sm text-muted-foreground">€</span>
                              </div>
                            )}
                            {!assignment.useOverride && (
                              <span className="text-sm text-muted-foreground">
                                {formatPrice(catalogPrice)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected count */}
            <div className="text-sm text-muted-foreground">
              {t("partnersAssigned", { count: selectedCount })}
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || isLoading}
          >
            {saveMutation.isPending && (
              <Loader2Icon className="size-4 animate-spin mr-2" />
            )}
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Badge component to show partner count on table rows
interface PartnerCountBadgeProps {
  count: number;
  onClick?: () => void;
}

export function PartnerCountBadge({ count, onClick }: PartnerCountBadgeProps) {
  const t = useTranslations("routes.partnerAssignment");

  if (count === 0) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onClick}
        className="h-7 px-2 text-muted-foreground hover:text-foreground"
      >
        <UsersIcon className="size-3.5 mr-1" />
        <span className="text-xs">{t("button")}</span>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="h-7 px-2"
    >
      <UsersIcon className="size-3.5 mr-1" />
      <span className="text-xs font-medium">{count}</span>
    </Button>
  );
}
