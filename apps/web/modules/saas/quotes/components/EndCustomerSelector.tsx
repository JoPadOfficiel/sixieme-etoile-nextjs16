"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { apiClient } from "@shared/lib/api-client";
import { Label } from "@ui/components/label";
import { Button } from "@ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui/components/select";
import { PlusIcon, StarIcon, UserIcon } from "lucide-react";
import { cn } from "@ui/lib";
import { EndCustomerFormDialog } from "@saas/contacts/components/EndCustomerFormDialog";
import type { EndCustomer } from "../types";
import type { EndCustomerWithCounts } from "@saas/contacts/types";

interface EndCustomerSelectorProps {
  contactId: string;
  value: string | null;
  onChange: (endCustomerId: string | null, endCustomer: EndCustomer | null) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * EndCustomerSelector Component
 * 
 * Story 24.4: Selector for end-customers within partner agency contacts.
 * Shows only when a partner contact is selected.
 * Includes inline creation capability.
 * 
 * @see Story 24.4: Add EndCustomer Selector to Quote Creation Form
 */
export function EndCustomerSelector({
  contactId,
  value,
  onChange,
  disabled = false,
  className,
}: EndCustomerSelectorProps) {
  const t = useTranslations("quotes.end_customer");
  const queryClient = useQueryClient();
  
  // State for inline creation dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [pendingAutoSelect, setPendingAutoSelect] = useState(false);

  // Fetch end-customers for the selected contact
  const { data: endCustomersData, isLoading } = useQuery({
    queryKey: ["end-customers", contactId],
    queryFn: async () => {
      if (!contactId) return { data: [] };
      const response = await apiClient.vtc.contacts[":contactId"]["end-customers"].$get({
        param: { contactId },
        query: {}, // Empty query for default pagination
      });
      if (!response.ok) throw new Error("Failed to fetch end-customers");
      return response.json();
    },
    enabled: !!contactId,
    staleTime: 30000, // Cache for 30 seconds
  });

  const endCustomers: EndCustomerWithCounts[] = endCustomersData?.data ?? [];

  // Auto-select newly created end-customer
  useEffect(() => {
    if (pendingAutoSelect && endCustomers.length > 0) {
      // Select the most recently created end-customer
      const latestCustomer = endCustomers.reduce((latest, current) => {
        return new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest;
      }, endCustomers[0]);
      
      if (latestCustomer) {
        onChange(latestCustomer.id, {
          id: latestCustomer.id,
          firstName: latestCustomer.firstName,
          lastName: latestCustomer.lastName,
          email: latestCustomer.email,
          phone: latestCustomer.phone,
          difficultyScore: latestCustomer.difficultyScore,
        });
      }
      setPendingAutoSelect(false);
    }
  }, [endCustomers, pendingAutoSelect, onChange]);

  // Handle dialog close - trigger auto-select on successful creation
  const handleDialogClose = (open: boolean) => {
    if (!open && isCreateDialogOpen) {
      // Dialog closed, invalidate query to refresh list
      queryClient.invalidateQueries({ queryKey: ["end-customers", contactId] });
      setPendingAutoSelect(true);
    }
    setIsCreateDialogOpen(open);
  };

  const handleValueChange = (selectedId: string) => {
    if (selectedId === "__create__") {
      setIsCreateDialogOpen(true);
      return;
    }
    
    if (selectedId === "__none__") {
      onChange(null, null);
      return;
    }

    const selectedCustomer = endCustomers.find(c => c.id === selectedId);
    if (selectedCustomer) {
      onChange(selectedCustomer.id, {
        id: selectedCustomer.id,
        firstName: selectedCustomer.firstName,
        lastName: selectedCustomer.lastName,
        email: selectedCustomer.email,
        phone: selectedCustomer.phone,
        difficultyScore: selectedCustomer.difficultyScore,
      });
    }
  };

  // Only hide if no contact is selected
  // Always render for partner contacts to enable inline creation (AC3)
  if (!contactId) {
    return null;
  }

  // Format difficulty score as stars
  const formatDifficultyScore = (score: number | null) => {
    if (!score) return "";
    return "★".repeat(score);
  };

  return (
    <>
      <div className={cn("space-y-2", className)}>
        <Label htmlFor="endCustomer">
          {t("label")}
        </Label>
        <Select
          value={value ?? "__none__"}
          onValueChange={handleValueChange}
          disabled={disabled || isLoading}
        >
          <SelectTrigger id="endCustomer" data-testid="end-customer-select">
            <SelectValue placeholder={t("placeholder")} />
          </SelectTrigger>
          <SelectContent>
            {/* No selection option */}
            <SelectItem value="__none__" data-testid="end-customer-option-none">
              <span className="text-muted-foreground">{t("placeholder")}</span>
            </SelectItem>
            
            {/* End-customer options */}
            {endCustomers.map((customer) => (
              <SelectItem 
                key={customer.id} 
                value={customer.id}
                data-testid={`end-customer-option-${customer.id}`}
              >
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.lastName} {customer.firstName}</span>
                  {customer.difficultyScore && (
                    <span className="text-amber-500 text-sm">
                      {formatDifficultyScore(customer.difficultyScore)}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
            
            {/* Create new option */}
            <SelectItem 
              value="__create__" 
              data-testid="end-customer-create"
              className="text-primary font-medium"
            >
              <div className="flex items-center gap-2">
                <PlusIcon className="h-4 w-4" />
                <span>{t("create_new")}</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        
        {/* Show selected customer info */}
        {value && endCustomers.find(c => c.id === value) && (
          <p className="text-xs text-muted-foreground">
            {(() => {
              const selected = endCustomers.find(c => c.id === value);
              if (!selected) return null;
              return selected.difficultyScore 
                ? `${t("difficultyScore")}: ${selected.difficultyScore}/5`
                : null;
            })()}
          </p>
        )}
      </div>

      {/* Create EndCustomer Dialog */}
      <EndCustomerFormDialog
        open={isCreateDialogOpen}
        onOpenChange={handleDialogClose}
        contactId={contactId}
        customer={null}
      />
    </>
  );
}

export default EndCustomerSelector;
