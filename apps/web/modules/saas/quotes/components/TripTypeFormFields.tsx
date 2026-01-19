"use client";

import { Checkbox } from "@ui/components/checkbox";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { cn } from "@ui/lib";
import { CalendarIcon, ClockIcon, InfoIcon, MapIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect } from "react";
import type { CreateQuoteFormData, QuoteStop, TripType } from "../types";
import { StopsEditor } from "./StopsEditor";

interface TripTypeFormFieldsProps {
	tripType: TripType;
	formData: CreateQuoteFormData;
	onFormChange: <K extends keyof CreateQuoteFormData>(
		field: K,
		value: CreateQuoteFormData[K],
	) => void;
	disabled?: boolean;
	className?: string;
}

/**
 * TripTypeFormFields Component
 *
 * Renders trip-type-specific form fields based on the selected trip type.
 *
 * - TRANSFER: Round trip checkbox
 * - EXCURSION: Stops editor + return date
 * - DISPO: Duration hours + max kilometers (auto-calculated)
 *
 * @see Story 16.2: Dynamic Form by Trip Type
 */
export function TripTypeFormFields({
	tripType,
	formData,
	onFormChange,
	disabled = false,
	className,
}: TripTypeFormFieldsProps) {
	const t = useTranslations();

	// Auto-calculate maxKilometers when durationHours changes (for DISPO)
	useEffect(() => {
		if (tripType === "DISPO" && formData.durationHours !== null) {
			const calculatedKm = formData.durationHours * 50;
			// Only update if different to avoid infinite loops
			if (formData.maxKilometers !== calculatedKm) {
				onFormChange("maxKilometers", calculatedKm);
			}
		}
	}, [tripType, formData.durationHours, formData.maxKilometers, onFormChange]);

	// Handle round trip checkbox change
	const handleRoundTripChange = useCallback(
		(checked: boolean) => {
			onFormChange("isRoundTrip", checked);
		},
		[onFormChange],
	);

	// Handle stops change
	const handleStopsChange = useCallback(
		(stops: QuoteStop[]) => {
			onFormChange("stops", stops);
		},
		[onFormChange],
	);

	// Handle return date change
	const handleReturnDateChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const value = e.target.value;
			if (value) {
				onFormChange("returnDate", new Date(value));
			} else {
				onFormChange("returnDate", null);
			}
		},
		[onFormChange],
	);

	// Handle duration hours change
	const handleDurationChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const value = Number.parseFloat(e.target.value);
			if (!isNaN(value) && value >= 1 && value <= 24) {
				onFormChange("durationHours", value);
			} else if (e.target.value === "") {
				onFormChange("durationHours", null);
			}
		},
		[onFormChange],
	);

	// Handle max kilometers change (manual override)
	const handleMaxKilometersChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const value = Number.parseFloat(e.target.value);
			if (!isNaN(value) && value >= 0) {
				onFormChange("maxKilometers", value);
			} else if (e.target.value === "") {
				onFormChange("maxKilometers", null);
			}
		},
		[onFormChange],
	);

	// Format date for date input
	const formatDateLocal = (date: Date | null): string => {
		if (!date) return "";
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	};

	// Render based on trip type
	switch (tripType) {
		case "TRANSFER":
			return (
				<div className={cn("space-y-4", className)}>
					{/* Round Trip Checkbox */}
					<div className="flex items-start space-x-3 rounded-lg border bg-muted/30 p-3">
						<Checkbox
							id="isRoundTrip"
							checked={formData.isRoundTrip}
							onCheckedChange={handleRoundTripChange}
							disabled={disabled}
						/>
						<div className="space-y-1">
							<Label
								htmlFor="isRoundTrip"
								className="cursor-pointer font-medium text-sm"
							>
								{t("quotes.create.tripTypeFields.roundTrip")}
							</Label>
							<p className="text-muted-foreground text-xs">
								{t("quotes.create.tripTypeFields.roundTripHint")}
							</p>
						</div>
					</div>
				</div>
			);

		case "EXCURSION":
			return (
				<div className={cn("space-y-4", className)}>
					{/* Stops Editor */}
					<div className="space-y-2">
						<Label className="flex items-center gap-2">
							<MapIcon className="h-4 w-4" />
							{t("quotes.create.tripTypeFields.intermediateStops")}
						</Label>
						<StopsEditor
							stops={formData.stops}
							onStopsChange={handleStopsChange}
							disabled={disabled}
							maxStops={10}
						/>
					</div>

					{/* Return Date */}
					<div className="space-y-2">
						<Label htmlFor="returnDate" className="flex items-center gap-2">
							<CalendarIcon className="h-4 w-4" />
							{t("quotes.create.tripTypeFields.returnDate")}
						</Label>
						<Input
							id="returnDate"
							type="date"
							value={formatDateLocal(formData.returnDate)}
							onChange={handleReturnDateChange}
							disabled={disabled}
							min={
								formData.pickupAt
									? formatDateLocal(formData.pickupAt)
									: undefined
							}
						/>
						<p className="text-muted-foreground text-xs">
							{t("quotes.create.tripTypeFields.returnDateHint")}
						</p>
					</div>
				</div>
			);

		case "DISPO":
			return (
				<div className={cn("space-y-4", className)}>
					{/* Duration Hours */}
					<div className="space-y-2">
						<Label htmlFor="durationHours" className="flex items-center gap-2">
							<ClockIcon className="h-4 w-4" />
							{t("quotes.create.tripTypeFields.durationHours")} *
						</Label>
						<Input
							id="durationHours"
							type="number"
							min={1}
							max={24}
							step={0.5}
							value={formData.durationHours ?? ""}
							onChange={handleDurationChange}
							disabled={disabled}
							placeholder="4"
						/>
						<p className="text-muted-foreground text-xs">
							{t("quotes.create.tripTypeFields.durationHoursHint")}
						</p>
					</div>

					{/* Max Kilometers */}
					<div className="space-y-2">
						<Label htmlFor="maxKilometers" className="flex items-center gap-2">
							<MapIcon className="h-4 w-4" />
							{t("quotes.create.tripTypeFields.maxKilometers")}
						</Label>
						<Input
							id="maxKilometers"
							type="number"
							min={0}
							step={10}
							value={formData.maxKilometers ?? ""}
							onChange={handleMaxKilometersChange}
							disabled={disabled}
							placeholder="200"
						/>
						{formData.durationHours && (
							<p className="flex items-center gap-1 text-muted-foreground text-xs">
								<InfoIcon className="h-3 w-3" />
								{t("quotes.create.tripTypeFields.maxKilometersHint", {
									hours: formData.durationHours,
									km: formData.durationHours * 50,
								})}
							</p>
						)}
					</div>
				</div>
			);

		default:
			return null;
	}
}

export default TripTypeFormFields;
