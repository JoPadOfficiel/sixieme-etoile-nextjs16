"use client";

import { Button } from "@ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { CalendarDaysIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { cn } from "@ui/lib";
import { StayDayCard } from "./StayDayCard";
import {
  createInitialStayDay,
  createInitialStayService,
  type CreateStayDayInput,
  type CreateStayServiceInput,
} from "../types";

interface StayFormFieldsProps {
  stayDays: CreateStayDayInput[];
  onStayDaysChange: (days: CreateStayDayInput[]) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * StayFormFields Component
 * 
 * Main container for STAY trip type form fields.
 * Manages the list of days and provides add/remove functionality.
 * 
 * @see Story 22.6: STAY Trip Type Frontend Interface
 */
export function StayFormFields({
  stayDays,
  onStayDaysChange,
  disabled = false,
  className,
}: StayFormFieldsProps) {
  const t = useTranslations();

  const handleAddDay = useCallback(() => {
    const newDay = createInitialStayDay();
    // Set date to day after last day if exists
    if (stayDays.length > 0) {
      const lastDay = stayDays[stayDays.length - 1];
      if (lastDay.date) {
        const nextDate = new Date(lastDay.date);
        nextDate.setDate(nextDate.getDate() + 1);
        newDay.date = nextDate;
      }
    }
    onStayDaysChange([...stayDays, newDay]);
  }, [stayDays, onStayDaysChange]);

  const handleRemoveDay = useCallback(
    (dayId: string) => {
      if (stayDays.length <= 1) return;
      onStayDaysChange(stayDays.filter((d) => d.id !== dayId));
    },
    [stayDays, onStayDaysChange]
  );

  const handleUpdateDay = useCallback(
    (dayId: string, updates: Partial<CreateStayDayInput>) => {
      onStayDaysChange(
        stayDays.map((d) => (d.id === dayId ? { ...d, ...updates } : d))
      );
    },
    [stayDays, onStayDaysChange]
  );

  const handleUpdateService = useCallback(
    (dayId: string, serviceId: string, updates: Partial<CreateStayServiceInput>) => {
      onStayDaysChange(
        stayDays.map((d) => {
          if (d.id !== dayId) return d;
          return {
            ...d,
            services: d.services.map((s) =>
              s.id === serviceId ? { ...s, ...updates } : s
            ),
          };
        })
      );
    },
    [stayDays, onStayDaysChange]
  );

  const handleAddService = useCallback(
    (dayId: string) => {
      onStayDaysChange(
        stayDays.map((d) => {
          if (d.id !== dayId) return d;
          return {
            ...d,
            services: [...d.services, createInitialStayService()],
          };
        })
      );
    },
    [stayDays, onStayDaysChange]
  );

  const handleRemoveService = useCallback(
    (dayId: string, serviceId: string) => {
      onStayDaysChange(
        stayDays.map((d) => {
          if (d.id !== dayId) return d;
          if (d.services.length <= 1) return d;
          return {
            ...d,
            services: d.services.filter((s) => s.id !== serviceId),
          };
        })
      );
    },
    [stayDays, onStayDaysChange]
  );

  // Calculate summary
  const totalServices = stayDays.reduce((sum, d) => sum + d.services.length, 0);
  const daysWithHotel = stayDays.filter((d) => d.hotelRequired).length;
  const totalMeals = stayDays.reduce((sum, d) => sum + d.mealCount, 0);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with Add Day button */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDaysIcon className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">{t("quotes.stay.packageConfiguration")}</span>
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddDay}
              disabled={disabled}
              className="w-full sm:w-auto"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              {t("quotes.stay.addDay")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 rounded-lg bg-muted/30">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {stayDays.length}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("quotes.stay.totalDays")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {totalServices}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("quotes.stay.totalServices")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {daysWithHotel}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("quotes.stay.hotelNights")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {totalMeals}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("quotes.stay.totalMeals")}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day Cards */}
      <div className="space-y-4">
        {stayDays.map((day, index) => (
          <StayDayCard
            key={day.id}
            day={day}
            dayIndex={index}
            onUpdate={handleUpdateDay}
            onRemove={handleRemoveDay}
            onUpdateService={handleUpdateService}
            onAddService={handleAddService}
            onRemoveService={handleRemoveService}
            canRemove={stayDays.length > 1}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Empty State */}
      {stayDays.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <CalendarDaysIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {t("quotes.stay.noDaysYet")}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleAddDay}
              disabled={disabled}
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              {t("quotes.stay.addFirstDay")}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default StayFormFields;
