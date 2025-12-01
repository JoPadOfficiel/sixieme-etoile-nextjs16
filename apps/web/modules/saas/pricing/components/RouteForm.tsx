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
import {
	ArrowLeftRightIcon,
	ArrowRightIcon,
	Loader2Icon,
	MapPinIcon,
	MapIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type {
	OriginDestinationType,
	PricingZone,
	RouteDirection,
	VehicleCategory,
	ZoneRoute,
	ZoneRouteFormData,
} from "../types";
import { MultiZoneSelect } from "./MultiZoneSelect";
import {
	AddressAutocomplete,
	type AddressResult,
} from "../../shared/components/AddressAutocomplete";

/**
 * Helper to get initial form data from route
 * Story 14.3: Extended to support multi-zone and address
 */
const getInitialFormData = (
	route?: ZoneRoute | null,
	defaultFromZoneId?: string,
	defaultToZoneId?: string,
): ZoneRouteFormData => {
	// Determine origin type and zones
	let originType: OriginDestinationType = "ZONES";
	let originZoneIds: string[] = [];
	let originPlaceId: string | undefined;
	let originAddress: string | undefined;
	let originLat: number | undefined;
	let originLng: number | undefined;

	if (route) {
		originType = route.originType || "ZONES";
		if (originType === "ADDRESS" && route.originPlaceId) {
			originPlaceId = route.originPlaceId;
			originAddress = route.originAddress || undefined;
			originLat = route.originLat || undefined;
			originLng = route.originLng || undefined;
		} else {
			// Use originZones if available, otherwise fall back to legacy fromZone
			originZoneIds = route.originZones?.map((oz) => oz.zoneId) || [];
			if (originZoneIds.length === 0 && route.fromZone?.id) {
				originZoneIds = [route.fromZone.id];
			}
		}
	} else if (defaultFromZoneId) {
		originZoneIds = [defaultFromZoneId];
	}

	// Determine destination type and zones
	let destinationType: OriginDestinationType = "ZONES";
	let destinationZoneIds: string[] = [];
	let destPlaceId: string | undefined;
	let destAddress: string | undefined;
	let destLat: number | undefined;
	let destLng: number | undefined;

	if (route) {
		destinationType = route.destinationType || "ZONES";
		if (destinationType === "ADDRESS" && route.destPlaceId) {
			destPlaceId = route.destPlaceId;
			destAddress = route.destAddress || undefined;
			destLat = route.destLat || undefined;
			destLng = route.destLng || undefined;
		} else {
			// Use destinationZones if available, otherwise fall back to legacy toZone
			destinationZoneIds = route.destinationZones?.map((dz) => dz.zoneId) || [];
			if (destinationZoneIds.length === 0 && route.toZone?.id) {
				destinationZoneIds = [route.toZone.id];
			}
		}
	} else if (defaultToZoneId) {
		destinationZoneIds = [defaultToZoneId];
	}

	return {
		originType,
		originZoneIds,
		originPlaceId,
		originAddress,
		originLat,
		originLng,
		destinationType,
		destinationZoneIds,
		destPlaceId,
		destAddress,
		destLat,
		destLng,
		vehicleCategoryId: route?.vehicleCategory.id ?? "",
		direction: route?.direction ?? "BIDIRECTIONAL",
		fixedPrice: route?.fixedPrice ?? 0,
		isActive: route?.isActive ?? true,
	};
};

interface RouteFormProps {
	route?: ZoneRoute | null;
	onSubmit: (data: ZoneRouteFormData) => Promise<void>;
	onCancel: () => void;
	isLoading?: boolean;
	zones: PricingZone[];
	vehicleCategories: VehicleCategory[];
	defaultFromZoneId?: string;
	defaultToZoneId?: string;
}

const DIRECTION_OPTIONS: {
	value: RouteDirection;
	labelKey: string;
	icon: React.ReactNode;
}[] = [
	{
		value: "BIDIRECTIONAL",
		labelKey: "routes.direction.bidirectional",
		icon: <ArrowLeftRightIcon className="size-4" />,
	},
	{
		value: "A_TO_B",
		labelKey: "routes.direction.aToB",
		icon: <ArrowRightIcon className="size-4" />,
	},
	{
		value: "B_TO_A",
		labelKey: "routes.direction.bToA",
		icon: <ArrowRightIcon className="size-4 rotate-180" />,
	},
];

/**
 * RouteForm Component
 * 
 * Form for creating and editing zone routes with flexible origin/destination.
 * Supports multi-zone selection and specific address selection.
 * 
 * Story 14.3: Extended for flexible route pricing
 */
export function RouteForm({
	route,
	onSubmit,
	onCancel,
	isLoading = false,
	zones,
	vehicleCategories,
	defaultFromZoneId,
	defaultToZoneId,
}: RouteFormProps) {
	const t = useTranslations();

	const [formData, setFormData] = useState<ZoneRouteFormData>(() =>
		getInitialFormData(route, defaultFromZoneId, defaultToZoneId),
	);

	const [errors, setErrors] = useState<Record<string, string>>({});

	const validate = (): boolean => {
		const newErrors: Record<string, string> = {};

		// Validate origin
		if (formData.originType === "ZONES") {
			if (formData.originZoneIds.length === 0) {
				newErrors.originZones = t("routes.errors.originZonesRequired");
			}
		} else {
			if (!formData.originAddress) {
				newErrors.originAddress = t("routes.errors.originAddressRequired");
			}
		}

		// Validate destination
		if (formData.destinationType === "ZONES") {
			if (formData.destinationZoneIds.length === 0) {
				newErrors.destinationZones = t("routes.errors.destinationZonesRequired");
			}
		} else {
			if (!formData.destAddress) {
				newErrors.destAddress = t("routes.errors.destinationAddressRequired");
			}
		}

		// Validate vehicle category
		if (!formData.vehicleCategoryId) {
			newErrors.vehicleCategoryId = t("routes.errors.vehicleCategoryRequired");
		}

		// Validate price
		if (formData.fixedPrice <= 0) {
			newErrors.fixedPrice = t("routes.errors.fixedPricePositive");
		}

		// Check for same zone (only if both are single zones)
		if (
			formData.originType === "ZONES" &&
			formData.destinationType === "ZONES" &&
			formData.originZoneIds.length === 1 &&
			formData.destinationZoneIds.length === 1 &&
			formData.originZoneIds[0] === formData.destinationZoneIds[0]
		) {
			newErrors.destinationZones = t("routes.errors.sameZone");
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!validate()) return;
		await onSubmit(formData);
	};

	// Handle origin address change
	const handleOriginAddressChange = (result: AddressResult) => {
		setFormData((prev) => ({
			...prev,
			originAddress: result.address,
			originLat: result.latitude ?? undefined,
			originLng: result.longitude ?? undefined,
		}));
	};

	// Handle destination address change
	const handleDestAddressChange = (result: AddressResult) => {
		setFormData((prev) => ({
			...prev,
			destAddress: result.address,
			destLat: result.latitude ?? undefined,
			destLng: result.longitude ?? undefined,
		}));
	};

	// Sort vehicle categories by name
	const sortedCategories = [...vehicleCategories].sort((a, b) =>
		a.name.localeCompare(b.name),
	);

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Origin Section */}
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<Label className="text-base font-semibold">
						{t("routes.form.origin")} *
					</Label>
					<Tabs
						value={formData.originType}
						onValueChange={(value) =>
							setFormData((prev) => ({
								...prev,
								originType: value as OriginDestinationType,
							}))
						}
					>
						<TabsList className="h-8">
							<TabsTrigger
								value="ZONES"
								className="text-xs px-3 gap-1"
								data-testid="origin-zones-toggle"
							>
								<MapIcon className="size-3" />
								{t("routes.form.zones")}
							</TabsTrigger>
							<TabsTrigger
								value="ADDRESS"
								className="text-xs px-3 gap-1"
								data-testid="origin-address-toggle"
							>
								<MapPinIcon className="size-3" />
								{t("routes.form.address")}
							</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>

				{formData.originType === "ZONES" ? (
					<MultiZoneSelect
						zones={zones}
						selectedIds={formData.originZoneIds}
						onChange={(ids) =>
							setFormData((prev) => ({ ...prev, originZoneIds: ids }))
						}
						placeholder={t("routes.form.selectOriginZones")}
						error={errors.originZones}
						testId="origin-zones-select"
					/>
				) : (
					<AddressAutocomplete
						id="originAddress"
						label=""
						value={formData.originAddress || ""}
						onChange={handleOriginAddressChange}
						placeholder={t("routes.form.searchOriginAddress")}
					/>
				)}
				{errors.originAddress && formData.originType === "ADDRESS" && (
					<p className="text-destructive text-sm">{errors.originAddress}</p>
				)}
			</div>

			{/* Destination Section */}
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<Label className="text-base font-semibold">
						{t("routes.form.destination")} *
					</Label>
					<Tabs
						value={formData.destinationType}
						onValueChange={(value) =>
							setFormData((prev) => ({
								...prev,
								destinationType: value as OriginDestinationType,
							}))
						}
					>
						<TabsList className="h-8">
							<TabsTrigger
								value="ZONES"
								className="text-xs px-3 gap-1"
								data-testid="destination-zones-toggle"
							>
								<MapIcon className="size-3" />
								{t("routes.form.zones")}
							</TabsTrigger>
							<TabsTrigger
								value="ADDRESS"
								className="text-xs px-3 gap-1"
								data-testid="destination-address-toggle"
							>
								<MapPinIcon className="size-3" />
								{t("routes.form.address")}
							</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>

				{formData.destinationType === "ZONES" ? (
					<MultiZoneSelect
						zones={zones}
						selectedIds={formData.destinationZoneIds}
						onChange={(ids) =>
							setFormData((prev) => ({ ...prev, destinationZoneIds: ids }))
						}
						placeholder={t("routes.form.selectDestinationZones")}
						error={errors.destinationZones}
						testId="destination-zones-select"
					/>
				) : (
					<AddressAutocomplete
						id="destAddress"
						label=""
						value={formData.destAddress || ""}
						onChange={handleDestAddressChange}
						placeholder={t("routes.form.searchDestinationAddress")}
					/>
				)}
				{errors.destAddress && formData.destinationType === "ADDRESS" && (
					<p className="text-destructive text-sm">{errors.destAddress}</p>
				)}
			</div>

			{/* Vehicle Category */}
			<div className="space-y-2">
				<Label htmlFor="vehicleCategoryId">
					{t("routes.form.vehicleCategory")} *
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
						<SelectValue placeholder={t("routes.form.selectVehicleCategory")} />
					</SelectTrigger>
					<SelectContent>
						{sortedCategories.map((category) => (
							<SelectItem key={category.id} value={category.id}>
								<span className="flex items-center gap-2">
									<span>{category.name}</span>
									<span className="text-muted-foreground text-xs">
										({category.maxPassengers} {t("routes.form.passengers")})
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

			{/* Direction */}
			<div className="space-y-2">
				<Label htmlFor="direction">{t("routes.form.direction")} *</Label>
				<Select
					value={formData.direction}
					onValueChange={(value) =>
						setFormData((prev) => ({
							...prev,
							direction: value as RouteDirection,
						}))
					}
				>
					<SelectTrigger id="direction">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{DIRECTION_OPTIONS.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								<span className="flex items-center gap-2">
									{option.icon}
									<span>{t(option.labelKey)}</span>
								</span>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Fixed Price */}
			<div className="space-y-2">
				<Label htmlFor="fixedPrice">
					{t("routes.form.fixedPrice")} (EUR) *
				</Label>
				<Input
					id="fixedPrice"
					type="number"
					step="0.01"
					min="0"
					value={formData.fixedPrice}
					onChange={(e) =>
						setFormData((prev) => ({
							...prev,
							fixedPrice: Number.parseFloat(e.target.value) || 0,
						}))
					}
					className={errors.fixedPrice ? "border-destructive" : ""}
					placeholder="85.00"
				/>
				{errors.fixedPrice && (
					<p className="text-destructive text-sm">{errors.fixedPrice}</p>
				)}
			</div>

			{/* Active Status */}
			<div className="flex items-center justify-between rounded-lg border p-4">
				<div className="space-y-0.5">
					<Label htmlFor="isActive">{t("routes.form.active")}</Label>
					<p className="text-muted-foreground text-sm">
						{t("routes.form.activeDescription")}
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
					{route ? t("common.save") : t("routes.form.createRoute")}
				</Button>
			</div>
		</form>
	);
}
