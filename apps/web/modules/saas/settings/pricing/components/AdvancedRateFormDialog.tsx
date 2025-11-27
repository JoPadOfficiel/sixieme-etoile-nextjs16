"use client";

/**
 * Advanced Rate Form Dialog Component
 * Story 9.2: Settings → Pricing – Advanced Rate Modifiers
 *
 * Create/Edit dialog for advanced rate modifiers with conditional fields
 */

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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { Switch } from "@ui/components/switch";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type {
	AdvancedRate,
	AdvancedRateAppliesTo,
	AdjustmentType,
	CreateAdvancedRateRequest,
	UpdateAdvancedRateRequest,
} from "../types/advanced-rate";
import {
	formatDaysOfWeekToString,
	parseDaysOfWeek,
	requiresDaysOfWeek,
	requiresDistanceFields,
	requiresTimeFields,
	requiresZoneField,
} from "../types/advanced-rate";

interface PricingZone {
	id: string;
	name: string;
}

interface AdvancedRateFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	rate: AdvancedRate | null;
	zones: PricingZone[];
	onSubmit: (data: CreateAdvancedRateRequest | UpdateAdvancedRateRequest) => void;
	isSubmitting: boolean;
}

const RATE_TYPES: AdvancedRateAppliesTo[] = [
	"NIGHT",
	"WEEKEND",
	"LONG_DISTANCE",
	"ZONE_SCENARIO",
	"HOLIDAY",
];

const ADJUSTMENT_TYPES: AdjustmentType[] = ["PERCENTAGE", "FIXED_AMOUNT"];

const DAYS_OF_WEEK = [0, 1, 2, 3, 4, 5, 6];

export function AdvancedRateFormDialog({
	open,
	onOpenChange,
	rate,
	zones,
	onSubmit,
	isSubmitting,
}: AdvancedRateFormDialogProps) {
	const t = useTranslations("settings.pricing.advancedRates");
	const isEditing = !!rate;

	// Compute initial values based on rate prop
	const initialName = rate?.name ?? "";
	const initialAppliesTo = rate?.appliesTo ?? "NIGHT";
	const initialStartTime = rate?.startTime ?? "22:00";
	const initialEndTime = rate?.endTime ?? "06:00";
	const initialSelectedDays = rate ? parseDaysOfWeek(rate.daysOfWeek) : [];
	const initialMinDistanceKm = rate?.minDistanceKm?.toString() ?? "";
	const initialMaxDistanceKm = rate?.maxDistanceKm?.toString() ?? "";
	const initialZoneId = rate?.zoneId ?? "";
	const initialAdjustmentType = rate?.adjustmentType ?? "PERCENTAGE";
	const initialValue = rate?.value?.toString() ?? "";
	const initialPriority = rate?.priority?.toString() ?? "0";
	const initialIsActive = rate?.isActive ?? true;

	// Form state - use key on Dialog to reset when rate changes
	const [name, setName] = useState(initialName);
	const [appliesTo, setAppliesTo] = useState<AdvancedRateAppliesTo>(initialAppliesTo);
	const [startTime, setStartTime] = useState(initialStartTime);
	const [endTime, setEndTime] = useState(initialEndTime);
	const [selectedDays, setSelectedDays] = useState<number[]>(initialSelectedDays);
	const [minDistanceKm, setMinDistanceKm] = useState(initialMinDistanceKm);
	const [maxDistanceKm, setMaxDistanceKm] = useState(initialMaxDistanceKm);
	const [zoneId, setZoneId] = useState(initialZoneId);
	const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>(initialAdjustmentType);
	const [value, setValue] = useState(initialValue);
	const [priority, setPriority] = useState(initialPriority);
	const [isActive, setIsActive] = useState(initialIsActive);

	// Reset form when rate changes (for edit mode switching)
	useEffect(() => {
		setName(initialName);
		setAppliesTo(initialAppliesTo);
		setStartTime(initialStartTime);
		setEndTime(initialEndTime);
		setSelectedDays(initialSelectedDays);
		setMinDistanceKm(initialMinDistanceKm);
		setMaxDistanceKm(initialMaxDistanceKm);
		setZoneId(initialZoneId);
		setAdjustmentType(initialAdjustmentType);
		setValue(initialValue);
		setPriority(initialPriority);
		setIsActive(initialIsActive);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [rate?.id]);

	// Handle day selection
	const toggleDay = (day: number) => {
		setSelectedDays((prev) =>
			prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
		);
	};

	// Handle form submission
	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		const data: CreateAdvancedRateRequest = {
			name,
			appliesTo,
			adjustmentType,
			value: parseFloat(value),
			priority: parseInt(priority, 10),
			isActive,
		};

		// Add conditional fields based on type
		if (requiresTimeFields(appliesTo)) {
			data.startTime = startTime || null;
			data.endTime = endTime || null;
		}

		if (requiresDaysOfWeek(appliesTo)) {
			data.daysOfWeek =
				selectedDays.length > 0 ? formatDaysOfWeekToString(selectedDays) : null;
		}

		if (requiresDistanceFields(appliesTo)) {
			data.minDistanceKm = minDistanceKm ? parseFloat(minDistanceKm) : null;
			data.maxDistanceKm = maxDistanceKm ? parseFloat(maxDistanceKm) : null;
		}

		if (requiresZoneField(appliesTo)) {
			data.zoneId = zoneId || null;
		}

		onSubmit(data);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="sm:max-w-[500px]"
				data-testid="rate-dialog"
			>
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>
							{isEditing ? t("form.editTitle") : t("form.createTitle")}
						</DialogTitle>
						<DialogDescription>
							{t("description")}
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						{/* Name */}
						<div className="grid gap-2">
							<Label htmlFor="name">{t("form.name")}</Label>
							<Input
								id="name"
								data-testid="name-input"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder={t("form.namePlaceholder")}
								maxLength={100}
								required
							/>
						</div>

						{/* Type */}
						<div className="grid gap-2">
							<Label htmlFor="type">{t("form.type")}</Label>
							<Select
								value={appliesTo}
								onValueChange={(v) => setAppliesTo(v as AdvancedRateAppliesTo)}
							>
								<SelectTrigger id="type" data-testid="type-select">
									<SelectValue placeholder={t("form.typePlaceholder")} />
								</SelectTrigger>
								<SelectContent>
									{RATE_TYPES.map((type) => (
										<SelectItem key={type} value={type}>
											{t(`types.${type}`)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Time fields (for NIGHT, WEEKEND, HOLIDAY) */}
						{requiresTimeFields(appliesTo) && (
							<div className="grid grid-cols-2 gap-4">
								<div className="grid gap-2">
									<Label htmlFor="startTime">{t("form.startTime")}</Label>
									<Input
										id="startTime"
										type="time"
										data-testid="start-time-input"
										value={startTime}
										onChange={(e) => setStartTime(e.target.value)}
										required
									/>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="endTime">{t("form.endTime")}</Label>
									<Input
										id="endTime"
										type="time"
										data-testid="end-time-input"
										value={endTime}
										onChange={(e) => setEndTime(e.target.value)}
										required
									/>
								</div>
							</div>
						)}

						{/* Days of week (for WEEKEND, HOLIDAY) */}
						{requiresDaysOfWeek(appliesTo) && (
							<div className="grid gap-2">
								<Label>{t("form.daysOfWeek")}</Label>
								<div className="flex flex-wrap gap-2">
									{DAYS_OF_WEEK.map((day) => (
										<div key={day} className="flex items-center space-x-2">
											<Checkbox
												id={`day-${day}`}
												checked={selectedDays.includes(day)}
												onCheckedChange={() => toggleDay(day)}
											/>
											<Label
												htmlFor={`day-${day}`}
												className="text-sm font-normal cursor-pointer"
											>
												{t(`form.days.${day}`)}
											</Label>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Distance fields (for LONG_DISTANCE) */}
						{requiresDistanceFields(appliesTo) && (
							<div className="grid grid-cols-2 gap-4">
								<div className="grid gap-2">
									<Label htmlFor="minDistance">{t("form.minDistance")}</Label>
									<Input
										id="minDistance"
										type="number"
										data-testid="min-distance-input"
										value={minDistanceKm}
										onChange={(e) => setMinDistanceKm(e.target.value)}
										min="0"
										step="0.01"
										required
									/>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="maxDistance">{t("form.maxDistance")}</Label>
									<Input
										id="maxDistance"
										type="number"
										data-testid="max-distance-input"
										value={maxDistanceKm}
										onChange={(e) => setMaxDistanceKm(e.target.value)}
										min="0"
										step="0.01"
									/>
									<p className="text-xs text-muted-foreground">
										{t("form.maxDistanceHelp")}
									</p>
								</div>
							</div>
						)}

						{/* Zone field (for ZONE_SCENARIO) */}
						{requiresZoneField(appliesTo) && (
							<div className="grid gap-2">
								<Label htmlFor="zone">{t("form.zone")}</Label>
								<Select value={zoneId} onValueChange={setZoneId}>
									<SelectTrigger id="zone" data-testid="zone-select">
										<SelectValue placeholder={t("form.zonePlaceholder")} />
									</SelectTrigger>
									<SelectContent>
										{zones.map((zone) => (
											<SelectItem key={zone.id} value={zone.id}>
												{zone.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}

						{/* Adjustment Type and Value */}
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="adjustmentType">
									{t("form.adjustmentType")}
								</Label>
								<Select
									value={adjustmentType}
									onValueChange={(v) => setAdjustmentType(v as AdjustmentType)}
								>
									<SelectTrigger
										id="adjustmentType"
										data-testid="adjustment-type-select"
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{ADJUSTMENT_TYPES.map((type) => (
											<SelectItem key={type} value={type}>
												{t(`form.adjustmentTypes.${type}`)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="value">{t("form.value")}</Label>
								<Input
									id="value"
									type="number"
									data-testid="value-input"
									value={value}
									onChange={(e) => setValue(e.target.value)}
									step="0.01"
									required
								/>
								<p className="text-xs text-muted-foreground">
									{t("form.valueHelp")}
								</p>
							</div>
						</div>

						{/* Priority */}
						<div className="grid gap-2">
							<Label htmlFor="priority">{t("form.priority")}</Label>
							<Input
								id="priority"
								type="number"
								data-testid="priority-input"
								value={priority}
								onChange={(e) => setPriority(e.target.value)}
								min="0"
							/>
							<p className="text-xs text-muted-foreground">
								{t("form.priorityHelp")}
							</p>
						</div>

						{/* Active toggle */}
						<div className="flex items-center justify-between">
							<Label htmlFor="isActive">{t("form.isActive")}</Label>
							<Switch
								id="isActive"
								checked={isActive}
								onCheckedChange={setIsActive}
							/>
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							{t("form.cancel")}
						</Button>
						<Button type="submit" disabled={isSubmitting} data-testid="submit-button">
							{isEditing ? t("form.save") : t("form.create")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
