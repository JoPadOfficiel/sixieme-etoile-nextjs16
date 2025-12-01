"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ui/components/table";
import { Badge } from "@ui/components/badge";
import { cn } from "@ui/lib";
import { ChevronDownIcon, ChevronRightIcon, RouteIcon, MapIcon, ClockIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { PriceOverrideCell } from "./PriceOverrideCell";
import type { ZoneRouteAssignment, PackageAssignment } from "../types";

interface ZoneRoutesTableProps {
  routes: ZoneRouteAssignment[];
  onPriceChange: (routeId: string, newPrice: number | null) => void;
  disabled?: boolean;
}

interface PackagesTableProps {
  packages: PackageAssignment[];
  onPriceChange: (packageId: string, newPrice: number | null) => void;
  type: "excursion" | "dispo";
  disabled?: boolean;
}

/**
 * Story 12.3: Collapsible table for zone routes with override prices
 * Story 13.1: i18n translations
 */
export function ZoneRoutesTable({ routes, onPriceChange, disabled = false }: ZoneRoutesTableProps) {
  const t = useTranslations("contacts.contract");
  const [isOpen, setIsOpen] = useState(true);
  
  const overrideCount = routes.filter(r => r.overridePrice !== null).length;

  if (routes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center text-muted-foreground">
        <RouteIcon className="mx-auto h-8 w-8 mb-2 opacity-50" />
        <p>{t("priceOverride.noRoutes")}</p>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-lg border bg-muted/50 px-4 py-3 hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          )}
          <RouteIcon className="h-4 w-4 text-primary" />
          <span className="font-medium">{t("zoneRoutes")}</span>
          <Badge variant="secondary" className="ml-2">
            {routes.length}
          </Badge>
          {overrideCount > 0 && (
            <Badge variant="default" className="ml-1">
              {t("priceOverride.countNegotiated", { count: overrideCount })}
            </Badge>
          )}
        </div>
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isOpen ? "mt-2 max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[35%]">{t("priceOverride.route")}</TableHead>
                <TableHead className="w-[20%]">{t("priceOverride.category")}</TableHead>
                <TableHead className="w-[15%] text-right">{t("priceOverride.catalogPrice")}</TableHead>
                <TableHead className="w-[30%]">{t("priceOverride.negotiatedPrice")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.map((route) => (
                <TableRow key={route.id} className="group">
                  <TableCell className="font-medium">
                    {route.fromZone.name} → {route.toZone.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{route.vehicleCategory.name}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {route.catalogPrice.toFixed(2)} €
                  </TableCell>
                  <TableCell>
                    <PriceOverrideCell
                      catalogPrice={route.catalogPrice}
                      overridePrice={route.overridePrice}
                      onSave={(newPrice) => onPriceChange(route.id, newPrice)}
                      disabled={disabled}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

/**
 * Story 12.3: Collapsible table for excursion/dispo packages with override prices
 * Story 13.1: i18n translations
 */
export function PackagesTable({ packages, onPriceChange, type, disabled = false }: PackagesTableProps) {
  const t = useTranslations("contacts.contract");
  const [isOpen, setIsOpen] = useState(true);
  
  const overrideCount = packages.filter(p => p.overridePrice !== null).length;
  const Icon = type === "excursion" ? MapIcon : ClockIcon;
  const title = type === "excursion" ? t("excursionPackages") : t("dispoPackages");
  const emptyMessage = type === "excursion" ? t("priceOverride.noExcursions") : t("priceOverride.noDispos");

  if (packages.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center text-muted-foreground">
        <Icon className="mx-auto h-8 w-8 mb-2 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-lg border bg-muted/50 px-4 py-3 hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          )}
          <Icon className="h-4 w-4 text-primary" />
          <span className="font-medium">{title}</span>
          <Badge variant="secondary" className="ml-2">
            {packages.length}
          </Badge>
          {overrideCount > 0 && (
            <Badge variant="default" className="ml-1">
              {t("priceOverride.countNegotiated", { count: overrideCount })}
            </Badge>
          )}
        </div>
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isOpen ? "mt-2 max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[45%]">{t("priceOverride.name")}</TableHead>
                <TableHead className="w-[20%] text-right">{t("priceOverride.catalogPrice")}</TableHead>
                <TableHead className="w-[35%]">{t("priceOverride.negotiatedPrice")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((pkg) => (
                <TableRow key={pkg.id} className="group">
                  <TableCell className="font-medium">
                    {pkg.name}
                    {pkg.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[300px]">
                        {pkg.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {pkg.catalogPrice.toFixed(2)} €
                  </TableCell>
                  <TableCell>
                    <PriceOverrideCell
                      catalogPrice={pkg.catalogPrice}
                      overridePrice={pkg.overridePrice}
                      onSave={(newPrice) => onPriceChange(pkg.id, newPrice)}
                      disabled={disabled}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
