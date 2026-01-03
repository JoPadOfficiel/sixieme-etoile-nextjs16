"use client";

import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui/components/select";
import { Textarea } from "@ui/components/textarea";
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  TrashIcon,
  MapIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { cn } from "@ui/lib";
import { AddressAutocomplete } from "@saas/shared/components/AddressAutocomplete";
import { StopsEditor } from "./StopsEditor";
import type {
  CreateStayServiceInput,
  StayServiceType,
  AddressWithCoordinates,
  QuoteStop,
} from "../types";

interface StayServiceFormProps {
  service: CreateStayServiceInput;
  serviceIndex: number;
  onUpdate: (serviceId: string, updates: Partial<CreateStayServiceInput>) => void;
  onRemove: (serviceId: string) => void;
  canRemove: boolean;
  disabled?: boolean;
  className?: string;
}

const SERVICE_TYPES: StayServiceType[] = ["TRANSFER", "DISPO", "EXCURSION"];

/**
 * StayServiceForm Component
 * 
 * Form for individual services within a stay day.
 * Adapts fields based on service type:
 * - TRANSFER: Pickup + Dropoff addresses, Pickup time
 * - DISPO: Pickup address, Pickup time, Duration hours
 * - EXCURSION: Pickup + Dropoff addresses, Pickup time, Stops editor
 * 
 * @see Story 22.6: STAY Trip Type Frontend Interface
 */
export function StayServiceForm({
  service,
  serviceIndex,
  onUpdate,
  onRemove,
  canRemove,
  disabled = false,
  className,
}: StayServiceFormProps) {
  const t = useTranslations();

  const handleServiceTypeChange = useCallback(
    (value: StayServiceType) => {
      onUpdate(service.id, { serviceType: value });
    },
    [service.id, onUpdate]
  );

  const handlePickupAddressChange = useCallback(
    (result: AddressWithCoordinates) => {
      onUpdate(service.id, {
        pickupAddress: result.address,
        pickupLatitude: result.latitude,
        pickupLongitude: result.longitude,
      });
    },
    [service.id, onUpdate]
  );

  const handleDropoffAddressChange = useCallback(
    (result: AddressWithCoordinates) => {
      onUpdate(service.id, {
        dropoffAddress: result.address,
        dropoffLatitude: result.latitude,
        dropoffLongitude: result.longitude,
      });
    },
    [service.id, onUpdate]
  );

  const handlePickupTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (value) {
        onUpdate(service.id, { pickupAt: new Date(value) });
      } else {
        onUpdate(service.id, { pickupAt: null });
      }
    },
    [service.id, onUpdate]
  );

  const handleDurationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      if (!isNaN(value) && value >= 1) {
        onUpdate(service.id, { durationHours: value });
      } else if (e.target.value === "") {
        onUpdate(service.id, { durationHours: null });
      }
    },
    [service.id, onUpdate]
  );

  const handleStopsChange = useCallback(
    (stops: QuoteStop[]) => {
      onUpdate(service.id, { stops });
    },
    [service.id, onUpdate]
  );

  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onUpdate(service.id, { notes: e.target.value });
    },
    [service.id, onUpdate]
  );

  const formatDateTimeLocal = (date: Date | null): string => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return (
    <div
      className={cn(
        "p-3 sm:p-4 rounded-lg border bg-card space-y-3 sm:space-y-4",
        className
      )}
    >
      {/* Service Header */}
      <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <MapPinIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium truncate">
            {t("quotes.stay.service")} {serviceIndex + 1}
          </span>
        </div>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(service.id)}
            disabled={disabled}
            className="text-destructive hover:text-destructive flex-shrink-0"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Service Type */}
      <div className="p-3 bg-background rounded-lg border space-y-2">
        <Label className="text-sm font-medium">{t("quotes.stay.serviceType")} *</Label>
        <Select
          value={service.serviceType}
          onValueChange={handleServiceTypeChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SERVICE_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {t(`quotes.stay.serviceTypes.${type.toLowerCase()}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Pickup Time */}
      <div className="p-3 bg-background rounded-lg border space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <CalendarIcon className="h-4 w-4" />
          {t("quotes.stay.pickupTime")} *
        </Label>
        <Input
          type="datetime-local"
          value={formatDateTimeLocal(service.pickupAt)}
          onChange={handlePickupTimeChange}
          disabled={disabled}
          className="w-full"
        />
      </div>

      {/* Pickup Address */}
      <div className="p-3 bg-background rounded-lg border space-y-2">
        <AddressAutocomplete
          id={`service-${service.id}-pickup`}
          label={t("quotes.create.pickup")}
          value={service.pickupAddress}
          onChange={handlePickupAddressChange}
          placeholder={t("quotes.create.pickupPlaceholder")}
          disabled={disabled}
          required
        />
      </div>

      {/* Dropoff Address - Not shown for DISPO */}
      {service.serviceType !== "DISPO" && (
        <div className="p-3 bg-background rounded-lg border space-y-2">
          <AddressAutocomplete
            id={`service-${service.id}-dropoff`}
            label={t("quotes.create.dropoff")}
            value={service.dropoffAddress}
            onChange={handleDropoffAddressChange}
            placeholder={t("quotes.create.dropoffPlaceholder")}
            disabled={disabled}
            required
          />
        </div>
      )}

      {/* Duration Hours - Only for DISPO */}
      {service.serviceType === "DISPO" && (
        <div className="p-3 bg-background rounded-lg border space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <ClockIcon className="h-4 w-4" />
            {t("quotes.create.tripTypeFields.durationHours")} *
          </Label>
          <Input
            type="number"
            min={1}
            max={24}
            step={0.5}
            value={service.durationHours ?? ""}
            onChange={handleDurationChange}
            disabled={disabled}
            placeholder="4"
            className="w-full"
          />
        </div>
      )}

      {/* Stops Editor - Only for EXCURSION */}
      {service.serviceType === "EXCURSION" && (
        <div className="p-3 bg-background rounded-lg border space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <MapIcon className="h-4 w-4" />
            {t("quotes.create.tripTypeFields.intermediateStops")}
          </Label>
          <StopsEditor
            stops={service.stops}
            onStopsChange={handleStopsChange}
            disabled={disabled}
            maxStops={5}
          />
        </div>
      )}

      {/* Notes */}
      <div className="p-3 bg-background rounded-lg border space-y-2">
        <Label className="text-sm font-medium">{t("quotes.stay.serviceNotes")}</Label>
        <Textarea
          value={service.notes}
          onChange={handleNotesChange}
          disabled={disabled}
          placeholder={t("quotes.stay.serviceNotesPlaceholder")}
          rows={2}
          className="w-full"
        />
      </div>
    </div>
  );
}

export default StayServiceForm;
