"use client";

/**
 * Seasonal Multiplier Form Dialog
 * Story 9.1: Settings → Pricing – Seasonal Multipliers
 *
 * Dialog for creating and editing seasonal multipliers
 */

import { Button } from "@ui/components/button";
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
import { Switch } from "@ui/components/switch";
import { Textarea } from "@ui/components/textarea";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import type {
	SeasonalMultiplier,
	CreateSeasonalMultiplierRequest,
	UpdateSeasonalMultiplierRequest,
} from "../types/seasonal-multiplier";
import { toISODateString, formatMultiplierAsPercent } from "../types/seasonal-multiplier";

interface SeasonalMultiplierFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	multiplier: SeasonalMultiplier | null;
	onSubmit: (
		data: CreateSeasonalMultiplierRequest | UpdateSeasonalMultiplierRequest
	) => Promise<void>;
	isSubmitting: boolean;
}

export function SeasonalMultiplierFormDialog({
	open,
	onOpenChange,
	multiplier,
	onSubmit,
	isSubmitting,
}: SeasonalMultiplierFormDialogProps) {
	const t = useTranslations("settings.pricing.seasonalMultipliers");
	const isEditing = !!multiplier;

	// Form state
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [multiplierValue, setMultiplierValue] = useState(1.0);
	const [priority, setPriority] = useState(0);
	const [isActive, setIsActive] = useState(true);

	// Validation errors
	const [errors, setErrors] = useState<Record<string, string>>({});

	// Handle dialog open state change
	const handleOpenChange = useCallback(
		(newOpen: boolean) => {
			if (newOpen) {
				// Reset form when opening
				if (multiplier) {
					setName(multiplier.name);
					setDescription(multiplier.description || "");
					setStartDate(multiplier.startDate.split("T")[0]);
					setEndDate(multiplier.endDate.split("T")[0]);
					setMultiplierValue(multiplier.multiplier);
					setPriority(multiplier.priority);
					setIsActive(multiplier.isActive);
				} else {
					// Default values for new multiplier
					setName("");
					setDescription("");
					const today = new Date();
					setStartDate(toISODateString(today));
					const nextMonth = new Date(today);
					nextMonth.setMonth(nextMonth.getMonth() + 1);
					setEndDate(toISODateString(nextMonth));
					setMultiplierValue(1.0);
					setPriority(0);
					setIsActive(true);
				}
				setErrors({});
			}
			onOpenChange(newOpen);
		},
		[multiplier, onOpenChange]
	);

	// Also reset when multiplier prop changes while dialog is open
	useEffect(() => {
		if (!open) return;
		if (multiplier) {
			setName(multiplier.name);
			setDescription(multiplier.description || "");
			setStartDate(multiplier.startDate.split("T")[0]);
			setEndDate(multiplier.endDate.split("T")[0]);
			setMultiplierValue(multiplier.multiplier);
			setPriority(multiplier.priority);
			setIsActive(multiplier.isActive);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [multiplier?.id]);

	const validate = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (!name.trim()) {
			newErrors.name = t("form.errors.nameRequired");
		} else if (name.length > 100) {
			newErrors.name = t("form.errors.nameTooLong");
		}

		if (!startDate) {
			newErrors.startDate = t("form.errors.startDateRequired");
		}

		if (!endDate) {
			newErrors.endDate = t("form.errors.endDateRequired");
		}

		if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
			newErrors.endDate = t("form.errors.endDateBeforeStart");
		}

		if (multiplierValue < 0.1 || multiplierValue > 3.0) {
			newErrors.multiplier = t("form.errors.multiplierRange");
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validate()) return;

		const data: CreateSeasonalMultiplierRequest = {
			name: name.trim(),
			description: description.trim() || null,
			startDate,
			endDate,
			multiplier: multiplierValue,
			priority,
			isActive,
		};

		await onSubmit(data);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-[500px]" data-testid="multiplier-dialog">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>
							{isEditing ? t("form.editTitle") : t("form.createTitle")}
						</DialogTitle>
						<DialogDescription>
							{isEditing ? t("form.editDescription") : t("form.createDescription")}
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						{/* Name */}
						<div className="grid gap-2">
							<Label htmlFor="name">{t("form.name")} *</Label>
							<Input
								id="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder={t("form.namePlaceholder")}
								data-testid="name-input"
							/>
							{errors.name && (
								<p className="text-sm text-destructive">{errors.name}</p>
							)}
						</div>

						{/* Description */}
						<div className="grid gap-2">
							<Label htmlFor="description">{t("form.description")}</Label>
							<Textarea
								id="description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder={t("form.descriptionPlaceholder")}
								rows={2}
								data-testid="description-input"
							/>
						</div>

						{/* Date Range */}
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="startDate">{t("form.startDate")} *</Label>
								<Input
									id="startDate"
									type="date"
									value={startDate}
									onChange={(e) => setStartDate(e.target.value)}
									data-testid="start-date-input"
								/>
								{errors.startDate && (
									<p className="text-sm text-destructive">{errors.startDate}</p>
								)}
							</div>
							<div className="grid gap-2">
								<Label htmlFor="endDate">{t("form.endDate")} *</Label>
								<Input
									id="endDate"
									type="date"
									value={endDate}
									onChange={(e) => setEndDate(e.target.value)}
									data-testid="end-date-input"
								/>
								{errors.endDate && (
									<p className="text-sm text-destructive">{errors.endDate}</p>
								)}
							</div>
						</div>

						{/* Multiplier Input */}
						<div className="grid gap-2">
							<div className="flex items-center justify-between">
								<Label htmlFor="multiplier">{t("form.multiplier")} *</Label>
								<span className="text-sm font-medium">
									{multiplierValue.toFixed(2)}x ({formatMultiplierAsPercent(multiplierValue)})
								</span>
							</div>
							<div className="flex items-center gap-3">
								<input
									id="multiplier"
									type="range"
									min={0.1}
									max={3.0}
									step={0.05}
									value={multiplierValue}
									onChange={(e) => setMultiplierValue(parseFloat(e.target.value))}
									className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary"
									data-testid="multiplier-slider"
								/>
								<Input
									type="number"
									min={0.1}
									max={3.0}
									step={0.05}
									value={multiplierValue}
									onChange={(e) => setMultiplierValue(parseFloat(e.target.value) || 1.0)}
									className="w-20"
								/>
							</div>
							<p className="text-xs text-muted-foreground">{t("form.multiplierHelp")}</p>
							{errors.multiplier && (
								<p className="text-sm text-destructive">{errors.multiplier}</p>
							)}
						</div>

						{/* Priority */}
						<div className="grid gap-2">
							<Label htmlFor="priority">{t("form.priority")}</Label>
							<Input
								id="priority"
								type="number"
								value={priority}
								onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
								data-testid="priority-input"
							/>
							<p className="text-xs text-muted-foreground">{t("form.priorityHelp")}</p>
						</div>

						{/* Active Toggle */}
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label htmlFor="isActive">{t("form.isActive")}</Label>
								<p className="text-xs text-muted-foreground">
									{t("form.isActiveHelp")}
								</p>
							</div>
							<Switch
								id="isActive"
								checked={isActive}
								onCheckedChange={setIsActive}
								data-testid="active-toggle"
							/>
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isSubmitting}
						>
							{t("form.cancel")}
						</Button>
						<Button type="submit" disabled={isSubmitting} data-testid="submit-button">
							{isSubmitting
								? t("form.saving")
								: isEditing
									? t("form.save")
									: t("form.create")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
