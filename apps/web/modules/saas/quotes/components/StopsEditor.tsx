"use client";

import { Button } from "@ui/components/button";
import { Card } from "@ui/components/card";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  TrashIcon,
  MapPinIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { cn } from "@ui/lib";
import { AddressAutocomplete, type AddressResult } from "@saas/shared/components/AddressAutocomplete";
import type { QuoteStop } from "../types";

interface StopsEditorProps {
  stops: QuoteStop[];
  onStopsChange: (stops: QuoteStop[]) => void;
  disabled?: boolean;
  maxStops?: number;
  className?: string;
}

/**
 * StopsEditor Component
 * 
 * Manages a dynamic list of intermediate stops for EXCURSION trips.
 * Features:
 * - Add/remove stops
 * - Address autocomplete per stop
 * - Reorder with up/down buttons
 * - Visual order numbers
 * 
 * @see Story 16.2: Dynamic Form by Trip Type
 */
export function StopsEditor({
  stops,
  onStopsChange,
  disabled = false,
  maxStops = 10,
  className,
}: StopsEditorProps) {
  const t = useTranslations();

  // Generate unique ID for new stops
  const generateStopId = useCallback(() => {
    return `stop-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  // Add a new stop
  const handleAddStop = useCallback(() => {
    if (stops.length >= maxStops) return;
    
    const newStop: QuoteStop = {
      id: generateStopId(),
      address: "",
      latitude: null,
      longitude: null,
      order: stops.length + 1,
    };
    
    onStopsChange([...stops, newStop]);
  }, [stops, maxStops, generateStopId, onStopsChange]);

  // Remove a stop
  const handleRemoveStop = useCallback((stopId: string) => {
    const updatedStops = stops
      .filter((stop) => stop.id !== stopId)
      .map((stop, index) => ({ ...stop, order: index + 1 }));
    
    onStopsChange(updatedStops);
  }, [stops, onStopsChange]);

  // Update stop address
  const handleStopAddressChange = useCallback((stopId: string, result: AddressResult) => {
    const updatedStops = stops.map((stop) =>
      stop.id === stopId
        ? {
            ...stop,
            address: result.address,
            latitude: result.latitude,
            longitude: result.longitude,
          }
        : stop
    );
    
    onStopsChange(updatedStops);
  }, [stops, onStopsChange]);

  // Move stop up
  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    
    const updatedStops = [...stops];
    [updatedStops[index - 1], updatedStops[index]] = [updatedStops[index], updatedStops[index - 1]];
    
    // Update order numbers
    const reorderedStops = updatedStops.map((stop, idx) => ({ ...stop, order: idx + 1 }));
    onStopsChange(reorderedStops);
  }, [stops, onStopsChange]);

  // Move stop down
  const handleMoveDown = useCallback((index: number) => {
    if (index === stops.length - 1) return;
    
    const updatedStops = [...stops];
    [updatedStops[index], updatedStops[index + 1]] = [updatedStops[index + 1], updatedStops[index]];
    
    // Update order numbers
    const reorderedStops = updatedStops.map((stop, idx) => ({ ...stop, order: idx + 1 }));
    onStopsChange(reorderedStops);
  }, [stops, onStopsChange]);

  const canAddMore = stops.length < maxStops;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Stops List */}
      {stops.length > 0 && (
        <div className="space-y-2">
          {stops.map((stop, index) => (
            <Card key={stop.id} className="p-3">
              <div className="flex items-start gap-2">
                {/* Order Number */}
                <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium mt-1">
                  {stop.order}
                </div>

                {/* Address Input */}
                <div className="flex-1 min-w-0">
                  <AddressAutocomplete
                    id={`stop-${stop.id}`}
                    label={t("quotes.create.tripTypeFields.stopLabel", { number: stop.order })}
                    value={stop.address}
                    onChange={(result) => handleStopAddressChange(stop.id, result)}
                    placeholder={t("quotes.create.pickupPlaceholder")}
                    disabled={disabled}
                    className="[&>label]:sr-only"
                  />
                </div>

                {/* Reorder Buttons */}
                <div className="flex-shrink-0 flex flex-col gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleMoveUp(index)}
                    disabled={disabled || index === 0}
                    aria-label={t("common.moveUp")}
                  >
                    <ChevronUpIcon className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleMoveDown(index)}
                    disabled={disabled || index === stops.length - 1}
                    aria-label={t("common.moveDown")}
                  >
                    <ChevronDownIcon className="h-3 w-3" />
                  </Button>
                </div>

                {/* Remove Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleRemoveStop(stop.id)}
                  disabled={disabled}
                  aria-label={t("quotes.create.tripTypeFields.removeStop")}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Stop Button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddStop}
        disabled={disabled || !canAddMore}
        className="w-full"
      >
        <PlusIcon className="h-4 w-4 mr-2" />
        {t("quotes.create.tripTypeFields.addStop")}
        {!canAddMore && ` (${t("common.max")} ${maxStops})`}
      </Button>

      {/* Empty State */}
      {stops.length === 0 && (
        <div className="text-center py-4 text-muted-foreground text-sm">
          <MapPinIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{t("quotes.create.tripTypeFields.noStopsYet")}</p>
        </div>
      )}
    </div>
  );
}

export default StopsEditor;
