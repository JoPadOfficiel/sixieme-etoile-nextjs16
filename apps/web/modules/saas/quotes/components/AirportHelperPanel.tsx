"use client";

import { Card, CardContent } from "@ui/components/card";
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
import { Badge } from "@ui/components/badge";
import { PlaneIcon, ChevronDownIcon, ChevronUpIcon, CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@ui/lib";
import type { AirportDetection, OptionalFeeWithRules } from "../hooks/useScenarioHelpers";

// ============================================================================
// Story 6.6: Airport Helper Panel Component
// Displays airport-specific options when an airport transfer is detected
// ============================================================================

interface AirportHelperPanelProps {
  airportDetection: AirportDetection;
  flightNumber: string;
  onFlightNumberChange: (value: string) => void;
  waitingTimeMinutes: number;
  onWaitingTimeChange: (value: number) => void;
  applicableFees: OptionalFeeWithRules[];
  selectedFeeIds: string[];
  onFeeToggle: (feeId: string, checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Waiting time presets for airport transfers
 */
const WAITING_TIME_PRESETS = [
  { value: 30, labelKey: "30min" },
  { value: 45, labelKey: "45min" },
  { value: 60, labelKey: "60min" },
  { value: 90, labelKey: "90min" },
  { value: 0, labelKey: "custom" },
];

/**
 * Format airport name for display
 */
function formatAirportName(airport: AirportDetection["detectedAirport"]): string {
  switch (airport) {
    case "CDG":
      return "Paris-Charles de Gaulle (CDG)";
    case "ORLY":
      return "Paris-Orly";
    case "LE_BOURGET":
      return "Paris-Le Bourget";
    case "OTHER":
      return "Airport";
    default:
      return "Airport";
  }
}

/**
 * Format price for display
 */
function formatPrice(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

/**
 * AirportHelperPanel Component
 * 
 * Displays airport-specific options when an airport transfer is detected:
 * - Flight number input (optional)
 * - Waiting time preset selector
 * - Auto-applied optional fees with checkboxes
 * 
 * @see Story 6.6: Implement Helpers for Common Scenarios
 * @see FR45: Helpers for airport transfers
 * @see FR56: Optional fees with automated triggers
 */
export function AirportHelperPanel({
  airportDetection,
  flightNumber,
  onFlightNumberChange,
  waitingTimeMinutes,
  onWaitingTimeChange,
  applicableFees,
  selectedFeeIds,
  onFeeToggle,
  disabled = false,
  className,
}: AirportHelperPanelProps) {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(true);

  if (!airportDetection.isAirportTransfer) {
    return null;
  }

  const airportName = formatAirportName(airportDetection.detectedAirport);
  const direction = airportDetection.isPickupAirport 
    ? t("quotes.helpers.airport.pickup")
    : t("quotes.helpers.airport.dropoff");

  return (
    <Card className={cn("border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30", className)}>
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full p-4 cursor-pointer hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <PlaneIcon className="size-4 text-blue-600 dark:text-blue-400" />
          <span className="font-medium text-blue-900 dark:text-blue-100">
            {t("quotes.helpers.airport.detected")}
          </span>
          <Badge variant="secondary" className="text-xs">
            {airportName}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {direction}
          </Badge>
        </div>
        {isOpen ? (
          <ChevronUpIcon className="size-4 text-blue-600 dark:text-blue-400" />
        ) : (
          <ChevronDownIcon className="size-4 text-blue-600 dark:text-blue-400" />
        )}
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <CardContent className="pt-0 pb-4 space-y-4">
          {/* Flight Number Input */}
          <div className="space-y-2">
            <Label htmlFor="flightNumber" className="text-sm">
              {t("quotes.helpers.airport.flightNumber")}
              <span className="text-muted-foreground ml-1">
                ({t("quotes.helpers.airport.optional")})
              </span>
            </Label>
            <Input
              id="flightNumber"
              value={flightNumber}
              onChange={(e) => onFlightNumberChange(e.target.value.toUpperCase())}
              placeholder="AF1234"
              disabled={disabled}
              className="uppercase"
              maxLength={10}
            />
            <p className="text-xs text-muted-foreground">
              {t("quotes.helpers.airport.flightNumberHint")}
            </p>
          </div>

          {/* Waiting Time Preset */}
          <div className="space-y-2">
            <Label htmlFor="waitingTime" className="text-sm">
              {t("quotes.helpers.airport.waitingTime")}
            </Label>
            <Select
              value={String(waitingTimeMinutes)}
              onValueChange={(value) => onWaitingTimeChange(Number(value))}
              disabled={disabled}
            >
              <SelectTrigger id="waitingTime">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WAITING_TIME_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={String(preset.value)}>
                    {preset.value === 0
                      ? t("quotes.helpers.airport.customWaiting")
                      : t(`quotes.helpers.airport.waitingPresets.${preset.labelKey}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t("quotes.helpers.airport.waitingTimeHint")}
            </p>
          </div>

          {/* Auto-Applied Fees */}
          {applicableFees.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">
                {t("quotes.helpers.airport.autoAppliedFees")}
              </Label>
              <div className="space-y-2 rounded-md border p-3 bg-white dark:bg-slate-900">
                {applicableFees.map((fee) => {
                  const isChecked = selectedFeeIds.includes(fee.id);
                  const feeAmount = fee.amountType === "FIXED" 
                    ? formatPrice(fee.amount)
                    : `${fee.amount}%`;

                  return (
                    <div
                      key={fee.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        {/* Custom checkbox using button */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn(
                            "size-5 p-0 border-2",
                            isChecked 
                              ? "bg-primary border-primary text-primary-foreground" 
                              : "border-muted-foreground"
                          )}
                          onClick={() => onFeeToggle(fee.id, !isChecked)}
                          disabled={disabled}
                        >
                          {isChecked && <CheckIcon className="size-3" />}
                        </Button>
                        <button
                          type="button"
                          onClick={() => onFeeToggle(fee.id, !isChecked)}
                          className="text-sm font-normal cursor-pointer text-left"
                          disabled={disabled}
                        >
                          {fee.name}
                        </button>
                        <Badge variant="outline" className="text-xs">
                          {t("quotes.helpers.airport.auto")}
                        </Badge>
                      </div>
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        +{feeAmount}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("quotes.helpers.airport.feesHint")}
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default AirportHelperPanel;
