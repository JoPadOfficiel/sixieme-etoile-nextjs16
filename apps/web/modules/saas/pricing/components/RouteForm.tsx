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
import { ArrowLeftRightIcon, ArrowRightIcon, Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type {
	PricingZone,
	RouteDirection,
	VehicleCategory,
	ZoneRoute,
	ZoneRouteFormData,
} from "../types";

// Helper to get initial form data from route
const getInitialFormData = (route?: ZoneRoute | null): ZoneRouteFormData => ({
	fromZoneId: route?.fromZone.id ?? "",
	toZoneId: route?.toZone.id ?? "",
	vehicleCategoryId: route?.vehicleCategory.id ?? "",
	direction: route?.direction ?? "BIDIRECTIONAL",
	fixedPrice: route?.fixedPrice ?? 0,
	isActive: route?.isActive ?? true,
});

interface RouteFormProps {
	route?: ZoneRoute | null;
	onSubmit: (data: ZoneRouteFormData) => Promise<void>;
	onCancel: () => void;
	isLoading?: boolean;
	zones: PricingZone[];
	vehicleCategories: VehicleCategory[];
}

const DIRECTION_OPTIONS: { value: RouteDirection; labelKey: string; icon: React.ReactNode }[] = [
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

export function RouteForm({
	route,
	onSubmit,
	onCancel,
	isLoading = false,
	zones,
	vehicleCategories,
}: RouteFormProps) {
	const t = useTranslations();

	const [formData, setFormData] = useState<ZoneRouteFormData>(() =>
		getInitialFormData(route),
	);

	const [errors, setErrors] = useState<Record<string, string>>({});

	const validate = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (!formData.fromZoneId) {
			newErrors.fromZoneId = t("routes.errors.fromZoneRequired");
		}
		if (!formData.toZoneId) {
			newErrors.toZoneId = t("routes.errors.toZoneRequired");
		}
		if (!formData.vehicleCategoryId) {
			newErrors.vehicleCategoryId = t("routes.errors.vehicleCategoryRequired");
		}
		if (formData.fixedPrice <= 0) {
			newErrors.fixedPrice = t("routes.errors.fixedPricePositive");
		}
		if (formData.fromZoneId && formData.toZoneId && formData.fromZoneId === formData.toZoneId) {
			newErrors.toZoneId = t("routes.errors.sameZone");
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!validate()) return;
		await onSubmit(formData);
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
			{/* From Zone */}
			<div className="space-y-2">
				<Label htmlFor="fromZoneId">{t("routes.form.fromZone")} *</Label>
				<Select
					value={formData.fromZoneId}
					onValueChange={(value) =>
						setFormData((prev) => ({ ...prev, fromZoneId: value }))
					}
				>
					<SelectTrigger id="fromZoneId" className={errors.fromZoneId ? "border-destructive" : ""}>
						<SelectValue placeholder={t("routes.form.selectFromZone")} />
					</SelectTrigger>
					<SelectContent>
						{activeZones.map((zone) => (
							<SelectItem key={zone.id} value={zone.id}>
								<span className="flex items-center gap-2">
									<span>{zone.name}</span>
									<span className="text-xs text-muted-foreground">({zone.code})</span>
								</span>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{errors.fromZoneId && (
					<p className="text-sm text-destructive">{errors.fromZoneId}</p>
				)}
			</div>

			{/* To Zone */}
			<div className="space-y-2">
				<Label htmlFor="toZoneId">{t("routes.form.toZone")} *</Label>
				<Select
					value={formData.toZoneId}
					onValueChange={(value) =>
						setFormData((prev) => ({ ...prev, toZoneId: value }))
					}
				>
					<SelectTrigger id="toZoneId" className={errors.toZoneId ? "border-destructive" : ""}>
						<SelectValue placeholder={t("routes.form.selectToZone")} />
					</SelectTrigger>
					<SelectContent>
						{activeZones.map((zone) => (
							<SelectItem key={zone.id} value={zone.id}>
								<span className="flex items-center gap-2">
									<span>{zone.name}</span>
									<span className="text-xs text-muted-foreground">({zone.code})</span>
								</span>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{errors.toZoneId && (
					<p className="text-sm text-destructive">{errors.toZoneId}</p>
				)}
			</div>

			{/* Vehicle Category */}
			<div className="space-y-2">
				<Label htmlFor="vehicleCategoryId">{t("routes.form.vehicleCategory")} *</Label>
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
									<span className="text-xs text-muted-foreground">
										({category.maxPassengers} {t("routes.form.passengers")})
									</span>
								</span>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{errors.vehicleCategoryId && (
					<p className="text-sm text-destructive">{errors.vehicleCategoryId}</p>
				)}
			</div>

			{/* Direction */}
			<div className="space-y-2">
				<Label htmlFor="direction">{t("routes.form.direction")} *</Label>
				<Select
					value={formData.direction}
					onValueChange={(value) =>
						setFormData((prev) => ({ ...prev, direction: value as RouteDirection }))
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
				<Label htmlFor="fixedPrice">{t("routes.form.fixedPrice")} (EUR) *</Label>
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
					<p className="text-sm text-destructive">{errors.fixedPrice}</p>
				)}
			</div>

			{/* Active Status */}
			<div className="flex items-center justify-between rounded-lg border p-4">
				<div className="space-y-0.5">
					<Label htmlFor="isActive">{t("routes.form.active")}</Label>
					<p className="text-sm text-muted-foreground">
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
			<div className="flex justify-end gap-3 pt-4 border-t">
				<Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
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
