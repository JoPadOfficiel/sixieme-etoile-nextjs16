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
import { Tabs, TabsList, TabsTrigger } from "@ui/components/tabs";
import { Textarea } from "@ui/components/textarea";
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type {
	ExcursionPackage,
	ExcursionPackageFormData,
	OriginDestinationType,
	PricingZone,
	VehicleCategory,
} from "../types";
import { AddressAutocomplete } from "../../shared/components/AddressAutocomplete";
import { MultiZoneSelect } from "./MultiZoneSelect";
import { useGoogleMapsApiKey } from "../../shared/hooks/useGoogleMapsApiKey";

// Helper to get initial form data from excursion
const getInitialFormData = (
	excursion?: ExcursionPackage | null,
): ExcursionPackageFormData => {
	// Determine origin type and zones from existing data
	const originType: OriginDestinationType = excursion?.originType ?? "ZONES";
	const destinationType: OriginDestinationType = excursion?.destinationType ?? "ZONES";
	
	// Get origin zone IDs from new multi-zone relation or legacy single zone
	const originZoneIds = excursion?.originZones?.map(oz => oz.zone.id) 
		?? (excursion?.originZone?.id ? [excursion.originZone.id] : []);
	
	// Get destination zone IDs from new multi-zone relation or legacy single zone
	const destinationZoneIds = excursion?.destinationZones?.map(dz => dz.zone.id)
		?? (excursion?.destinationZone?.id ? [excursion.destinationZone.id] : []);

	return {
		name: excursion?.name ?? "",
		description: excursion?.description ?? "",
		// New flexible fields
		originType,
		originZoneIds,
		originAddress: excursion?.originAddress ?? "",
		originLat: excursion?.originLat ?? null,
		originLng: excursion?.originLng ?? null,
		originPlaceId: excursion?.originPlaceId ?? "",
		destinationType,
		destinationZoneIds,
		destAddress: excursion?.destAddress ?? "",
		destLat: excursion?.destLat ?? null,
		destLng: excursion?.destLng ?? null,
		destPlaceId: excursion?.destPlaceId ?? "",
		// Legacy fields (backward compatibility)
		originZoneId: excursion?.originZone?.id ?? "",
		destinationZoneId: excursion?.destinationZone?.id ?? "",
		// Common fields
		vehicleCategoryId: excursion?.vehicleCategory?.id ?? "",
		includedDurationHours: excursion?.includedDurationHours ?? 4,
		includedDistanceKm: excursion?.includedDistanceKm ?? 100,
		price: excursion?.price ?? 0,
		isActive: excursion?.isActive ?? true,
	};
};

interface ExcursionFormProps {
	excursion?: ExcursionPackage | null;
	onSubmit: (data: ExcursionPackageFormData) => Promise<void>;
	onCancel: () => void;
	isLoading?: boolean;
	zones: PricingZone[];
	vehicleCategories: VehicleCategory[];
}

export function ExcursionForm({
	excursion,
	onSubmit,
	onCancel,
	isLoading = false,
	zones,
	vehicleCategories,
}: ExcursionFormProps) {
	const t = useTranslations();
	const { data: googleMapsApiKey } = useGoogleMapsApiKey();

	const [formData, setFormData] = useState<ExcursionPackageFormData>(() =>
		getInitialFormData(excursion),
	);

	const [errors, setErrors] = useState<Record<string, string>>({});

	const validate = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (!formData.name.trim()) {
			newErrors.name = t("excursions.errors.nameRequired");
		}
		if (!formData.vehicleCategoryId) {
			newErrors.vehicleCategoryId = t(
				"excursions.errors.vehicleCategoryRequired",
			);
		}
		if (formData.includedDurationHours <= 0) {
			newErrors.includedDurationHours = t("excursions.errors.durationPositive");
		}
		if (formData.includedDistanceKm <= 0) {
			newErrors.includedDistanceKm = t("excursions.errors.distancePositive");
		}
		if (formData.price <= 0) {
			newErrors.price = t("excursions.errors.pricePositive");
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!validate()) return;

		// Clean up empty zone IDs
		const submitData: ExcursionPackageFormData = {
			...formData,
			originZoneId: formData.originZoneId || null,
			destinationZoneId: formData.destinationZoneId || null,
		};

		await onSubmit(submitData);
	};

	// Sort zones by name for better UX
	const sortedZones = [...zones].sort((a, b) => a.name.localeCompare(b.name));
	const activeZones = sortedZones.filter((z) => z.isActive);

	// Sort vehicle categories by name
	const sortedCategories = [...vehicleCategories].sort((a, b) =>
		a.name.localeCompare(b.name),
	);

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Name */}
			<div className="space-y-2">
				<Label htmlFor="name">{t("excursions.form.name")} *</Label>
				<Input
					id="name"
					value={formData.name}
					onChange={(e) =>
						setFormData((prev) => ({ ...prev, name: e.target.value }))
					}
					className={errors.name ? "border-destructive" : ""}
					placeholder={t("excursions.form.namePlaceholder")}
				/>
				{errors.name && (
					<p className="text-destructive text-sm">{errors.name}</p>
				)}
			</div>

			{/* Description */}
			<div className="space-y-2">
				<Label htmlFor="description">{t("excursions.form.description")}</Label>
				<Textarea
					id="description"
					value={formData.description ?? ""}
					onChange={(e) =>
						setFormData((prev) => ({ ...prev, description: e.target.value }))
					}
					placeholder={t("excursions.form.descriptionPlaceholder")}
					rows={3}
				/>
			</div>

			{/* Origin Section */}
			<div className="space-y-3 rounded-lg border p-4">
				<Label>{t("routes.form.origin")}</Label>
				<Tabs
					value={formData.originType}
					onValueChange={(value) =>
						setFormData((prev) => ({
							...prev,
							originType: value as OriginDestinationType,
						}))
					}
				>
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="ZONES">{t("routes.form.zones")}</TabsTrigger>
						<TabsTrigger value="ADDRESS">{t("routes.form.address")}</TabsTrigger>
					</TabsList>
				</Tabs>

				{formData.originType === "ZONES" ? (
					<MultiZoneSelect
						zones={activeZones}
						selectedIds={formData.originZoneIds}
						onChange={(zoneIds) =>
							setFormData((prev) => ({
								...prev,
								originZoneIds: zoneIds,
								originZoneId: zoneIds[0] || "",
							}))
						}
						placeholder={t("routes.form.selectOriginZones")}
						googleMapsApiKey={googleMapsApiKey}
					/>
				) : (
					<AddressAutocomplete
						id="originAddress"
						label=""
						value={formData.originAddress ?? ""}
						onChange={(result) =>
							setFormData((prev) => ({
								...prev,
								originAddress: result.address,
								originLat: result.latitude,
								originLng: result.longitude,
								originPlaceId: "",
							}))
						}
						placeholder={t("routes.form.searchOriginAddress")}
					/>
				)}
			</div>

			{/* Destination Section */}
			<div className="space-y-3 rounded-lg border p-4">
				<Label>{t("routes.form.destination")}</Label>
				<Tabs
					value={formData.destinationType}
					onValueChange={(value) =>
						setFormData((prev) => ({
							...prev,
							destinationType: value as OriginDestinationType,
						}))
					}
				>
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="ZONES">{t("routes.form.zones")}</TabsTrigger>
						<TabsTrigger value="ADDRESS">{t("routes.form.address")}</TabsTrigger>
					</TabsList>
				</Tabs>

				{formData.destinationType === "ZONES" ? (
					<MultiZoneSelect
						zones={activeZones}
						selectedIds={formData.destinationZoneIds}
						onChange={(zoneIds) =>
							setFormData((prev) => ({
								...prev,
								destinationZoneIds: zoneIds,
								destinationZoneId: zoneIds[0] || "",
							}))
						}
						placeholder={t("routes.form.selectDestinationZones")}
						googleMapsApiKey={googleMapsApiKey}
					/>
				) : (
					<AddressAutocomplete
						id="destAddress"
						label=""
						value={formData.destAddress ?? ""}
						onChange={(result) =>
							setFormData((prev) => ({
								...prev,
								destAddress: result.address,
								destLat: result.latitude,
								destLng: result.longitude,
								destPlaceId: "",
							}))
						}
						placeholder={t("routes.form.searchDestinationAddress")}
					/>
				)}
			</div>

			{/* Vehicle Category */}
			<div className="space-y-2">
				<Label htmlFor="vehicleCategoryId">
					{t("excursions.form.vehicleCategory")} *
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
						<SelectValue
							placeholder={t("excursions.form.selectVehicleCategory")}
						/>
					</SelectTrigger>
					<SelectContent>
						{sortedCategories.map((category) => (
							<SelectItem key={category.id} value={category.id}>
								<span className="flex items-center gap-2">
									<span>{category.name}</span>
									<span className="text-muted-foreground text-xs">
										({category.maxPassengers} {t("excursions.form.passengers")})
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
					{t("excursions.form.includedDuration")} *
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
					{t("excursions.form.durationHelp")}
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
					{t("excursions.form.includedDistance")} *
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
					{t("excursions.form.distanceHelp")}
				</p>
				{errors.includedDistanceKm && (
					<p className="text-destructive text-sm">
						{errors.includedDistanceKm}
					</p>
				)}
			</div>

			{/* Price */}
			<div className="space-y-2">
				<Label htmlFor="price">{t("excursions.form.price")} (EUR) *</Label>
				<Input
					id="price"
					type="number"
					step="0.01"
					min="0"
					value={formData.price}
					onChange={(e) =>
						setFormData((prev) => ({
							...prev,
							price: Number.parseFloat(e.target.value) || 0,
						}))
					}
					className={errors.price ? "border-destructive" : ""}
					placeholder="350.00"
				/>
				{errors.price && (
					<p className="text-destructive text-sm">{errors.price}</p>
				)}
			</div>

			{/* Active Status */}
			<div className="flex items-center justify-between rounded-lg border p-4">
				<div className="space-y-0.5">
					<Label htmlFor="isActive">{t("excursions.form.active")}</Label>
					<p className="text-muted-foreground text-sm">
						{t("excursions.form.activeDescription")}
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
					{excursion ? t("common.save") : t("excursions.form.createExcursion")}
				</Button>
			</div>
		</form>
	);
}
