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
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { PricingZone, PricingZoneFormData, ZoneType } from "../types";
import { ZoneDrawingMap } from "./ZoneDrawingMap";

interface ZoneFormProps {
	zone?: PricingZone | null;
	zones: PricingZone[]; // For parent zone selection
	onSubmit: (data: PricingZoneFormData) => void;
	onCancel: () => void;
	isSubmitting?: boolean;
	googleMapsApiKey?: string | null;
	initialZoneType?: ZoneType;
	initialCenterLatitude?: number | null;
	initialCenterLongitude?: number | null;
	initialRadiusKm?: number | null;
	initialGeometry?: unknown | null;
}

export function ZoneForm({
	zone,
	zones,
	onSubmit,
	onCancel,
	isSubmitting,
	googleMapsApiKey,
 	initialZoneType,
	initialCenterLatitude,
	initialCenterLongitude,
	initialRadiusKm,
	initialGeometry,
}: ZoneFormProps) {
	const t = useTranslations();
	const isEditing = !!zone;

	// Initial values: prefer existing zone (edit), otherwise values coming
	// from the map click (passed by ZoneDrawer), and finally sensible defaults.
	const effectiveZoneType: ZoneType =
		zone?.zoneType ?? initialZoneType ?? "POLYGON";
	const effectiveCenterLatitude =
		zone?.centerLatitude ?? initialCenterLatitude ?? null;
	const effectiveCenterLongitude =
		zone?.centerLongitude ?? initialCenterLongitude ?? null;
	const effectiveRadiusKm = zone?.radiusKm ?? initialRadiusKm ?? null;
	const effectiveGeometry = zone?.geometry ?? initialGeometry ?? null;

	const [formData, setFormData] = useState<PricingZoneFormData>({
		name: zone?.name ?? "",
		code: zone?.code ?? "",
		zoneType: effectiveZoneType,
		centerLatitude: effectiveCenterLatitude,
		centerLongitude: effectiveCenterLongitude,
		radiusKm: effectiveRadiusKm,
		geometry: effectiveGeometry,
		parentZoneId: zone?.parentZoneId ?? null,
		isActive: zone?.isActive ?? true,
	});

	// Geometry is now managed by the map component
	const [geometry, setGeometry] = useState<unknown>(effectiveGeometry);

	// Auto-generate code from name (inline in handler instead of useEffect)
	const handleNameChange = (name: string) => {
		if (!isEditing) {
			const code = name
				.toUpperCase()
				.replace(/[^A-Z0-9]/g, "_")
				.replace(/_+/g, "_")
				.replace(/^_|_$/g, "");
			setFormData((prev) => ({ ...prev, name, code }));
		} else {
			setFormData((prev) => ({ ...prev, name }));
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		onSubmit({
			...formData,
			geometry,
		});
	};

	// Filter out current zone from parent options to prevent self-reference
	const parentZoneOptions = zones.filter((z) => z.id !== zone?.id);

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Name */}
			<div className="space-y-2">
				<Label htmlFor="name">{t("pricing.zones.form.name")} *</Label>
				<Input
					id="name"
					value={formData.name}
					onChange={(e) => handleNameChange(e.target.value)}
					placeholder={t("pricing.zones.form.namePlaceholder")}
					required
				/>
			</div>

			{/* Code */}
			<div className="space-y-2">
				<Label htmlFor="code">{t("pricing.zones.form.code")} *</Label>
				<Input
					id="code"
					value={formData.code}
					onChange={(e) =>
						setFormData((prev) => ({
							...prev,
							code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""),
						}))
					}
					placeholder="PARIS_0"
					required
					pattern="^[A-Z0-9_]+$"
				/>
				<p className="text-sm text-muted-foreground">
					{t("pricing.zones.form.codeHelp")}
				</p>
			</div>

			{/* Zone Type */}
			<div className="space-y-2">
				<Label>{t("pricing.zones.form.type")}</Label>
				<Select
					value={formData.zoneType}
					onValueChange={(value: ZoneType) =>
						setFormData((prev) => ({ ...prev, zoneType: value }))
					}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="POLYGON">
							{t("pricing.zones.types.POLYGON")}
						</SelectItem>
						<SelectItem value="RADIUS">
							{t("pricing.zones.types.RADIUS")}
						</SelectItem>
						<SelectItem value="POINT">
							{t("pricing.zones.types.POINT")}
						</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Zone Drawing Map */}
			<ZoneDrawingMap
				zoneType={formData.zoneType}
				geometry={geometry as { type: "Polygon"; coordinates: number[][][] } | null}
				centerLatitude={formData.centerLatitude ?? null}
				centerLongitude={formData.centerLongitude ?? null}
				radiusKm={formData.radiusKm ?? null}
				onZoneTypeChange={(type) =>
					setFormData((prev) => ({ ...prev, zoneType: type }))
				}
				onGeometryChange={(geo) => setGeometry(geo)}
				onCenterChange={(lat, lng) =>
					setFormData((prev) => ({
						...prev,
						centerLatitude: lat,
						centerLongitude: lng,
					}))
				}
				onRadiusChange={(radius) =>
					setFormData((prev) => ({ ...prev, radiusKm: radius }))
				}
				googleMapsApiKey={googleMapsApiKey}
			/>

			{/* Parent Zone */}
			<div className="space-y-2">
				<Label>{t("pricing.zones.form.parentZone")}</Label>
				<Select
					value={formData.parentZoneId ?? "none"}
					onValueChange={(value) =>
						setFormData((prev) => ({
							...prev,
							parentZoneId: value === "none" ? null : value,
						}))
					}
				>
					<SelectTrigger>
						<SelectValue placeholder={t("pricing.zones.form.noParent")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="none">
							{t("pricing.zones.form.noParent")}
						</SelectItem>
						{parentZoneOptions.map((z) => (
							<SelectItem key={z.id} value={z.id}>
								{z.name} ({z.code})
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Active Status */}
			<div className="flex items-center justify-between">
				<div className="space-y-0.5">
					<Label>{t("pricing.zones.form.isActive")}</Label>
					<p className="text-sm text-muted-foreground">
						{t("pricing.zones.form.isActiveHelp")}
					</p>
				</div>
				<Switch
					checked={formData.isActive}
					onCheckedChange={(checked) =>
						setFormData((prev) => ({ ...prev, isActive: checked }))
					}
				/>
			</div>

			{/* Actions */}
			<div className="flex justify-end gap-3 pt-4 border-t">
				<Button type="button" variant="outline" onClick={onCancel}>
					{t("common.confirmation.cancel")}
				</Button>
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting
						? t("common.saving")
						: isEditing
							? t("pricing.zones.form.update")
							: t("pricing.zones.form.create")}
				</Button>
			</div>
		</form>
	);
}
