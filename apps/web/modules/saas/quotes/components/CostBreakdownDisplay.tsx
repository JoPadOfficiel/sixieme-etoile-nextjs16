"use client";

/**
 * CostBreakdownDisplay Component
 * Story 15.7: Display detailed cost breakdown for quotes and invoices
 * 
 * Shows fuel, tolls, driver, wear, and parking costs with transparency
 * indicators for toll source (Google API vs estimate).
 */

import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Badge } from "@ui/components/badge";
import { 
  Fuel, 
  Car, 
  User, 
  Wrench, 
  ParkingCircle, 
  Receipt,
  Info
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ui/components/tooltip";
import type { CostBreakdown, FuelType, TollSource } from "../../shared/types/pricing";
import { formatPrice } from "../../shared/types/pricing";

interface CostBreakdownDisplayProps {
  breakdown: CostBreakdown | null | undefined;
  className?: string;
  compact?: boolean;
}

/**
 * Get fuel type display label
 */
function getFuelTypeLabel(fuelType?: FuelType): string {
  switch (fuelType) {
    case "DIESEL":
      return "Diesel";
    case "GASOLINE":
      return "Essence";
    case "LPG":
      return "GPL";
    case "ELECTRIC":
      return "Électrique";
    default:
      return "Carburant";
  }
}

/**
 * Get toll source badge variant
 */
function getTollSourceBadge(source?: TollSource, isFromCache?: boolean) {
  if (source === "GOOGLE_API") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="text-xs ml-1">
              API
              {isFromCache && <span className="ml-0.5">⚡</span>}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Péages réels via Google Routes API</p>
            {isFromCache && <p className="text-xs text-muted-foreground">Depuis le cache</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return null;
}

/**
 * Cost row component
 */
function CostRow({
  icon: Icon,
  iconColor,
  label,
  amount,
  badge,
  details,
}: {
  icon: React.ElementType;
  iconColor: string;
  label: string;
  amount: number;
  badge?: React.ReactNode;
  details?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <span className="text-sm">{label}</span>
        {badge}
        {details && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{details}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <span className="font-medium tabular-nums">{formatPrice(amount)}</span>
    </div>
  );
}

/**
 * CostBreakdownDisplay - Shows detailed cost breakdown
 */
export function CostBreakdownDisplay({ 
  breakdown, 
  className,
  compact = false 
}: CostBreakdownDisplayProps) {
  // Handle null/undefined breakdown
  if (!breakdown) {
    return (
      <Card className={className}>
        <CardHeader className={compact ? "py-3" : undefined}>
          <CardTitle className="text-sm flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Détail des coûts
          </CardTitle>
        </CardHeader>
        <CardContent className={compact ? "py-2" : undefined}>
          <p className="text-muted-foreground text-sm">Non disponible</p>
        </CardContent>
      </Card>
    );
  }

  const { fuel, tolls, driver, wear, parking, total } = breakdown;

  return (
    <Card className={className}>
      <CardHeader className={compact ? "py-3" : undefined}>
        <CardTitle className="text-sm flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          Détail des coûts
        </CardTitle>
      </CardHeader>
      <CardContent className={`space-y-1 ${compact ? "py-2" : ""}`}>
        {/* Fuel */}
        {fuel && (
        <CostRow
          icon={Fuel}
          iconColor="text-orange-500"
          label={getFuelTypeLabel(fuel.fuelType)}
          amount={fuel.amount}
          details={`${fuel.distanceKm.toFixed(0)} km × ${fuel.consumptionL100km} L/100km × ${fuel.pricePerLiter.toFixed(3)}€/L`}
        />
        )}

        {/* Tolls */}
        {tolls && (
        <CostRow
          icon={Car}
          iconColor="text-blue-500"
          label="Péages"
          amount={tolls.amount}
          badge={getTollSourceBadge(tolls.source, tolls.isFromCache)}
          details={tolls.source === "GOOGLE_API" 
            ? "Données réelles Google Routes" 
            : `Estimation: ${tolls.distanceKm.toFixed(0)} km × ${tolls.ratePerKm.toFixed(3)}€/km`
          }
        />
        )}

        {/* Driver */}
        {driver && (
        <CostRow
          icon={User}
          iconColor="text-green-500"
          label="Chauffeur"
          amount={driver.amount}
          details={`${Math.round(driver.durationMinutes / 60 * 10) / 10}h × ${driver.hourlyRate.toFixed(2)}€/h`}
        />
        )}

        {/* Wear */}
        {wear && (
        <CostRow
          icon={Wrench}
          iconColor="text-gray-500"
          label="Usure"
          amount={wear.amount}
          details={`${wear.distanceKm.toFixed(0)} km × ${wear.ratePerKm.toFixed(3)}€/km`}
        />
        )}

        {/* Parking (only if > 0) */}
        {parking && parking.amount > 0 && (
          <CostRow
            icon={ParkingCircle}
            iconColor="text-purple-500"
            label="Parking"
            amount={parking.amount}
            details={parking.description || undefined}
          />
        )}

        {/* Separator and Total */}
        <div className="border-t my-2" />
        
        <div className="flex items-center justify-between font-semibold">
          <span>Coût interne total</span>
          <span className="tabular-nums">{formatPrice(total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default CostBreakdownDisplay;
