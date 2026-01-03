"use client";

import { Button } from "@ui/components/button";
import { Card, CardContent, CardHeader } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui/components/select";
import { Switch } from "@ui/components/switch";
import { Textarea } from "@ui/components/textarea";
import {
  CalendarIcon,
  HotelIcon,
  PlusIcon,
  TrashIcon,
  UtensilsIcon,
  UsersIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { cn } from "@ui/lib";
import { StayServiceForm } from "./StayServiceForm";
import type {
  CreateStayDayInput,
  CreateStayServiceInput,
} from "../types";

interface StayDayCardProps {
  day: CreateStayDayInput;
  dayIndex: number;
  onUpdate: (dayId: string, updates: Partial<CreateStayDayInput>) => void;
  onRemove: (dayId: string) => void;
  onUpdateService: (
    dayId: string,
    serviceId: string,
    updates: Partial<CreateStayServiceInput>
  ) => void;
  onAddService: (dayId: string) => void;
  onRemoveService: (dayId: string, serviceId: string) => void;
  canRemove: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * StayDayCard Component
 * 
 * Card UI for each day in a STAY quote.
 * Contains:
 * - Day number and date picker
 * - Staffing controls (hotel, meals, drivers)
 * - Services list with add/remove controls
 * - Day notes
 * 
 * @see Story 22.6: STAY Trip Type Frontend Interface
 */
export function StayDayCard({
  day,
  dayIndex,
  onUpdate,
  onRemove,
  onUpdateService,
  onAddService,
  onRemoveService,
  canRemove,
  disabled = false,
  className,
}: StayDayCardProps) {
  const t = useTranslations();
  const [isExpanded, setIsExpanded] = useState(true);

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (value) {
        onUpdate(day.id, { date: new Date(value) });
      } else {
        onUpdate(day.id, { date: null });
      }
    },
    [day.id, onUpdate]
  );

  const handleHotelChange = useCallback(
    (checked: boolean) => {
      onUpdate(day.id, { hotelRequired: checked });
    },
    [day.id, onUpdate]
  );

  const handleMealCountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value);
      if (!isNaN(value) && value >= 0) {
        onUpdate(day.id, { mealCount: value });
      }
    },
    [day.id, onUpdate]
  );

  const handleDriverCountChange = useCallback(
    (value: string) => {
      onUpdate(day.id, { driverCount: parseInt(value) });
    },
    [day.id, onUpdate]
  );

  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onUpdate(day.id, { notes: e.target.value });
    },
    [day.id, onUpdate]
  );

  const handleServiceUpdate = useCallback(
    (serviceId: string, updates: Partial<CreateStayServiceInput>) => {
      onUpdateService(day.id, serviceId, updates);
    },
    [day.id, onUpdateService]
  );

  const handleServiceRemove = useCallback(
    (serviceId: string) => {
      onRemoveService(day.id, serviceId);
    },
    [day.id, onRemoveService]
  );

  const handleAddService = useCallback(() => {
    onAddService(day.id);
  }, [day.id, onAddService]);

  const formatDateLocal = (date: Date | null): string => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const dayNum = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${dayNum}`;
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 h-auto"
            >
              {isExpanded ? (
                <ChevronUpIcon className="h-4 w-4" />
              ) : (
                <ChevronDownIcon className="h-4 w-4" />
              )}
            </Button>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <span className="font-semibold">
                {t("quotes.stay.day")} {dayIndex + 1}
              </span>
            </div>
            <Input
              type="date"
              value={formatDateLocal(day.date)}
              onChange={handleDateChange}
              disabled={disabled}
              className="w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {day.services.length} {t("quotes.stay.services")}
            </span>
            {canRemove && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemove(day.id)}
                disabled={disabled}
                className="text-destructive hover:text-destructive"
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-4 space-y-6">
          {/* Staffing Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg border bg-muted/20">
            {/* Hotel Required */}
            <div className="flex items-center justify-between space-x-2">
              <Label className="flex items-center gap-2 cursor-pointer">
                <HotelIcon className="h-4 w-4 text-muted-foreground" />
                {t("quotes.stay.hotelRequired")}
              </Label>
              <Switch
                checked={day.hotelRequired}
                onCheckedChange={handleHotelChange}
                disabled={disabled}
              />
            </div>

            {/* Meal Count */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <UtensilsIcon className="h-4 w-4 text-muted-foreground" />
                {t("quotes.stay.mealCount")}
              </Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={day.mealCount}
                onChange={handleMealCountChange}
                disabled={disabled}
              />
            </div>

            {/* Driver Count */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4 text-muted-foreground" />
                {t("quotes.stay.driverCount")}
              </Label>
              <Select
                value={String(day.driverCount)}
                onValueChange={handleDriverCountChange}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 {t("quotes.stay.driver")}</SelectItem>
                  <SelectItem value="2">2 {t("quotes.stay.drivers")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">
                {t("quotes.stay.servicesForDay")}
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddService}
                disabled={disabled}
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                {t("quotes.stay.addService")}
              </Button>
            </div>

            <div className="space-y-3">
              {day.services.map((service, serviceIndex) => (
                <StayServiceForm
                  key={service.id}
                  service={service}
                  serviceIndex={serviceIndex}
                  onUpdate={handleServiceUpdate}
                  onRemove={handleServiceRemove}
                  canRemove={day.services.length > 1}
                  disabled={disabled}
                />
              ))}
            </div>
          </div>

          {/* Day Notes */}
          <div className="space-y-2">
            <Label>{t("quotes.stay.dayNotes")}</Label>
            <Textarea
              value={day.notes}
              onChange={handleNotesChange}
              disabled={disabled}
              placeholder={t("quotes.stay.dayNotesPlaceholder")}
              rows={2}
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default StayDayCard;
