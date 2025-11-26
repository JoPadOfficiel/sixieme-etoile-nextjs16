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
import { Switch } from "@ui/components/switch";
import { Textarea } from "@ui/components/textarea";
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type {
	DispoPackage,
	DispoPackageFormData,
	VehicleCategory,
} from "../types";

// Helper to get initial form data from dispo
const getInitialFormData = (
	dispo?: DispoPackage | null,
): DispoPackageFormData => ({
	name: dispo?.name ?? "",
	description: dispo?.description ?? "",
	vehicleCategoryId: dispo?.vehicleCategory.id ?? "",
	includedDurationHours: dispo?.includedDurationHours ?? 4,
	includedDistanceKm: dispo?.includedDistanceKm ?? 100,
	basePrice: dispo?.basePrice ?? 0,
	overageRatePerKm: dispo?.overageRatePerKm ?? 0,
	overageRatePerHour: dispo?.overageRatePerHour ?? 0,
	isActive: dispo?.isActive ?? true,
});

interface DispoFormProps {
	dispo?: DispoPackage | null;
	onSubmit: (data: DispoPackageFormData) => Promise<void>;
	onCancel: () => void;
	isLoading?: boolean;
	vehicleCategories: VehicleCategory[];
}

export function DispoForm({
	dispo,
	onSubmit,
	onCancel,
	isLoading = false,
	vehicleCategories,
}: DispoFormProps) {
	const t = useTranslations();

	const [formData, setFormData] = useState<DispoPackageFormData>(() =>
		getInitialFormData(dispo),
	);

	const [errors, setErrors] = useState<Record<string, string>>({});

	const validate = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (!formData.name.trim()) {
			newErrors.name = t("dispos.errors.nameRequired");
		}
		if (!formData.vehicleCategoryId) {
			newErrors.vehicleCategoryId = t("dispos.errors.vehicleCategoryRequired");
		}
		if (formData.includedDurationHours <= 0) {
			newErrors.includedDurationHours = t("dispos.errors.durationPositive");
		}
		if (formData.includedDistanceKm <= 0) {
			newErrors.includedDistanceKm = t("dispos.errors.distancePositive");
		}
		if (formData.basePrice <= 0) {
			newErrors.basePrice = t("dispos.errors.basePricePositive");
		}
		if (formData.overageRatePerKm < 0) {
			newErrors.overageRatePerKm = t("dispos.errors.overageRateNonNegative");
		}
		if (formData.overageRatePerHour < 0) {
			newErrors.overageRatePerHour = t("dispos.errors.overageRateNonNegative");
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!validate()) return;
		await onSubmit(formData);
	};

	// Sort vehicle categories by name
	const sortedCategories = [...vehicleCategories].sort((a, b) =>
		a.name.localeCompare(b.name),
	);

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Name */}
			<div className="space-y-2">
				<Label htmlFor="name">{t("dispos.form.name")} *</Label>
				<Input
					id="name"
					value={formData.name}
					onChange={(e) =>
						setFormData((prev) => ({ ...prev, name: e.target.value }))
					}
					className={errors.name ? "border-destructive" : ""}
					placeholder={t("dispos.form.namePlaceholder")}
				/>
				{errors.name && (
					<p className="text-destructive text-sm">{errors.name}</p>
				)}
			</div>

			{/* Description */}
			<div className="space-y-2">
				<Label htmlFor="description">{t("dispos.form.description")}</Label>
				<Textarea
					id="description"
					value={formData.description ?? ""}
					onChange={(e) =>
						setFormData((prev) => ({ ...prev, description: e.target.value }))
					}
					placeholder={t("dispos.form.descriptionPlaceholder")}
					rows={3}
				/>
			</div>

			{/* Vehicle Category */}
			<div className="space-y-2">
				<Label htmlFor="vehicleCategoryId">
					{t("dispos.form.vehicleCategory")} *
				</Label>
				<Select
					value={formData.vehicleCategoryId}
					onValueChange={(value) =>
						setFormData((prev) => ({ ...prev, vehicleCategoryId: value }))
					}
				>
					<SelectTrigger
						id="vehicleCategoryId"
						className={errors.vehicleCategoryId ? "border-destructive" : ""}
					>
						<SelectValue placeholder={t("dispos.form.selectVehicleCategory")} />
					</SelectTrigger>
					<SelectContent>
						{sortedCategories.map((category) => (
							<SelectItem key={category.id} value={category.id}>
								<span className="flex items-center gap-2">
									<span>{category.name}</span>
									<span className="text-muted-foreground text-xs">
										({category.maxPassengers} {t("dispos.form.passengers")})
									</span>
								</span>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{errors.vehicleCategoryId && (
					<p className="text-destructive text-sm">{errors.vehicleCategoryId}</p>
				)}
			</div>

			{/* Included Duration */}
			<div className="space-y-2">
				<Label htmlFor="includedDurationHours">
					{t("dispos.form.includedDuration")} *
				</Label>
				<Input
					id="includedDurationHours"
					type="number"
					step="0.5"
					min="0.5"
					value={formData.includedDurationHours}
					onChange={(e) =>
						setFormData((prev) => ({
							...prev,
							includedDurationHours: Number.parseFloat(e.target.value) || 0,
						}))
					}
					className={errors.includedDurationHours ? "border-destructive" : ""}
					placeholder="4"
				/>
				<p className="text-muted-foreground text-xs">
					{t("dispos.form.durationHelp")}
				</p>
				{errors.includedDurationHours && (
					<p className="text-destructive text-sm">
						{errors.includedDurationHours}
					</p>
				)}
			</div>

			{/* Included Distance */}
			<div className="space-y-2">
				<Label htmlFor="includedDistanceKm">
					{t("dispos.form.includedDistance")} *
				</Label>
				<Input
					id="includedDistanceKm"
					type="number"
					step="1"
					min="1"
					value={formData.includedDistanceKm}
					onChange={(e) =>
						setFormData((prev) => ({
							...prev,
							includedDistanceKm: Number.parseFloat(e.target.value) || 0,
						}))
					}
					className={errors.includedDistanceKm ? "border-destructive" : ""}
					placeholder="100"
				/>
				<p className="text-muted-foreground text-xs">
					{t("dispos.form.distanceHelp")}
				</p>
				{errors.includedDistanceKm && (
					<p className="text-destructive text-sm">
						{errors.includedDistanceKm}
					</p>
				)}
			</div>

			{/* Base Price */}
			<div className="space-y-2">
				<Label htmlFor="basePrice">{t("dispos.form.basePrice")} (EUR) *</Label>
				<Input
					id="basePrice"
					type="number"
					step="0.01"
					min="0"
					value={formData.basePrice}
					onChange={(e) =>
						setFormData((prev) => ({
							...prev,
							basePrice: Number.parseFloat(e.target.value) || 0,
						}))
					}
					className={errors.basePrice ? "border-destructive" : ""}
					placeholder="250.00"
				/>
				{errors.basePrice && (
					<p className="text-destructive text-sm">{errors.basePrice}</p>
				)}
			</div>

			{/* Overage Rates Section */}
			<div className="space-y-4 rounded-lg border p-4">
				<h4 className="font-medium">{t("dispos.form.overageRates")}</h4>
				<p className="text-muted-foreground text-sm">
					{t("dispos.form.overageRatesHelp")}
				</p>

				{/* Overage Rate Per Km */}
				<div className="space-y-2">
					<Label htmlFor="overageRatePerKm">
						{t("dispos.form.overageRatePerKm")} (EUR)
					</Label>
					<Input
						id="overageRatePerKm"
						type="number"
						step="0.01"
						min="0"
						value={formData.overageRatePerKm}
						onChange={(e) =>
							setFormData((prev) => ({
								...prev,
								overageRatePerKm: Number.parseFloat(e.target.value) || 0,
							}))
						}
						className={errors.overageRatePerKm ? "border-destructive" : ""}
						placeholder="1.50"
					/>
					{errors.overageRatePerKm && (
						<p className="text-destructive text-sm">
							{errors.overageRatePerKm}
						</p>
					)}
				</div>

				{/* Overage Rate Per Hour */}
				<div className="space-y-2">
					<Label htmlFor="overageRatePerHour">
						{t("dispos.form.overageRatePerHour")} (EUR)
					</Label>
					<Input
						id="overageRatePerHour"
						type="number"
						step="0.01"
						min="0"
						value={formData.overageRatePerHour}
						onChange={(e) =>
							setFormData((prev) => ({
								...prev,
								overageRatePerHour: Number.parseFloat(e.target.value) || 0,
							}))
						}
						className={errors.overageRatePerHour ? "border-destructive" : ""}
						placeholder="45.00"
					/>
					{errors.overageRatePerHour && (
						<p className="text-destructive text-sm">
							{errors.overageRatePerHour}
						</p>
					)}
				</div>
			</div>

			{/* Active Status */}
			<div className="flex items-center justify-between rounded-lg border p-4">
				<div className="space-y-0.5">
					<Label htmlFor="isActive">{t("dispos.form.active")}</Label>
					<p className="text-muted-foreground text-sm">
						{t("dispos.form.activeDescription")}
					</p>
				</div>
				<Switch
					id="isActive"
					checked={formData.isActive}
					onCheckedChange={(checked) =>
						setFormData((prev) => ({ ...prev, isActive: checked }))
					}
				/>
			</div>

			{/* Actions */}
			<div className="flex justify-end gap-3 border-t pt-4">
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					disabled={isLoading}
				>
					{t("common.cancel")}
				</Button>
				<Button type="submit" disabled={isLoading}>
					{isLoading && <Loader2Icon className="mr-2 size-4 animate-spin" />}
					{dispo ? t("common.save") : t("dispos.form.createDispo")}
				</Button>
			</div>
		</form>
	);
}
