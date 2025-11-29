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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/components/tabs";
import { useToast } from "@ui/hooks/use-toast";
import { Loader2Icon, MailIcon, MapIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

type CreationTab = "draw" | "postal";
import type { PricingZone, PricingZoneFormData, ZoneType } from "../types";
import { ZONE_COLORS } from "../types";
import { PostalCodeInput } from "./PostalCodeInput";
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

	const { toast } = useToast();

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
		color: zone?.color ?? ZONE_COLORS[0].value,
		postalCodes: zone?.postalCodes ?? [],
		creationMethod: zone?.creationMethod ?? null,
		// Story 11.3: Zone pricing multiplier
		priceMultiplier: zone?.priceMultiplier ?? 1.0,
		multiplierDescription: zone?.multiplierDescription ?? null,
	});

	// Geometry is now managed by the map component
	const [geometry, setGeometry] = useState<unknown>(effectiveGeometry);

	// Creation method tab (only for new zones)
	const [creationTab, setCreationTab] = useState<CreationTab>(
		zone?.creationMethod === "POSTAL_CODE" ? "postal" : "draw"
	);

	// Postal codes state
	const [postalCodes, setPostalCodes] = useState<string[]>(zone?.postalCodes ?? []);
	const [isLoadingGeometry, setIsLoadingGeometry] = useState(false);

	// Fetch geometry from postal codes
	const fetchPostalCodeGeometry = useCallback(async () => {
		if (postalCodes.length === 0) {
			return;
		}

		setIsLoadingGeometry(true);
		try {
			const response = await fetch("/api/vtc/postal-codes/geometry", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					postalCodes,
					countryCode: "FR",
				}),
			});

			const data = await response.json();

			if (data.success && data.geometry) {
				setGeometry(data.geometry);
				if (data.center) {
					setFormData((prev) => ({
						...prev,
						centerLatitude: data.center.latitude,
						centerLongitude: data.center.longitude,
						zoneType: "POLYGON",
					}));
				}
				toast({
					title: t("common.success"),
					description: t("pricing.zones.postalCodes.geometryLoaded"),
				});
			} else {
				toast({
					title: t("common.error"),
					description: data.errors?.join(", ") || t("pricing.zones.postalCodes.geometryError"),
					variant: "error",
				});
			}
		} catch (error) {
			console.error("Error fetching postal code geometry:", error);
			toast({
				title: t("common.error"),
				description: t("pricing.zones.postalCodes.geometryError"),
				variant: "error",
			});
		} finally {
			setIsLoadingGeometry(false);
		}
	}, [postalCodes, t, toast]);

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

		// For editing, preserve the creation method and include updated postal codes
		// For new zones, use the selected tab
		const isPostalCodeZone = isEditing 
			? zone?.creationMethod === "POSTAL_CODE" 
			: creationTab === "postal";

		onSubmit({
			...formData,
			geometry,
			postalCodes: isPostalCodeZone ? postalCodes : [],
			creationMethod: isPostalCodeZone ? "POSTAL_CODE" : "DRAW",
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
				<p className="text-muted-foreground text-sm">
					{t("pricing.zones.form.codeHelp")}
				</p>
			</div>

			{/* Creation Method Tabs (only for new zones) */}
			{!isEditing && (
				<Tabs value={creationTab} onValueChange={(v) => setCreationTab(v as CreationTab)}>
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="draw" className="flex items-center gap-2">
							<MapIcon className="h-4 w-4" />
							{t("pricing.zones.creationMethod.draw")}
						</TabsTrigger>
						<TabsTrigger value="postal" className="flex items-center gap-2">
							<MailIcon className="h-4 w-4" />
							{t("pricing.zones.creationMethod.postalCodes")}
						</TabsTrigger>
					</TabsList>

					<TabsContent value="draw" className="space-y-4 pt-4">
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
							geometry={
								geometry as { type: "Polygon"; coordinates: number[][][] } | null
							}
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
					</TabsContent>

					<TabsContent value="postal" className="space-y-4 pt-4">
						{/* Postal Code Input */}
						<PostalCodeInput
							value={postalCodes}
							onChange={setPostalCodes}
							maxCodes={20}
						/>

						{/* Load Geometry Button */}
						{postalCodes.length > 0 && (
							<Button
								type="button"
								variant="outline"
								onClick={fetchPostalCodeGeometry}
								disabled={isLoadingGeometry}
								className="w-full"
							>
								{isLoadingGeometry && (
									<Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
								)}
								{t("pricing.zones.postalCodes.loadGeometry")}
							</Button>
						)}

						{/* Preview Map (read-only) */}
						{geometry && (
							<div className="space-y-2">
								<Label>{t("pricing.zones.postalCodes.preview")}</Label>
								<ZoneDrawingMap
									zoneType="POLYGON"
									geometry={
										geometry as { type: "Polygon"; coordinates: number[][][] } | null
									}
									centerLatitude={formData.centerLatitude ?? null}
									centerLongitude={formData.centerLongitude ?? null}
									radiusKm={null}
									onZoneTypeChange={() => {}}
									onGeometryChange={() => {}}
									onCenterChange={() => {}}
									onRadiusChange={() => {}}
									googleMapsApiKey={googleMapsApiKey}
								/>
							</div>
						)}
					</TabsContent>
				</Tabs>
			)}

			{/* For editing, show the map directly */}
			{isEditing && (
				<>
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
						geometry={
							geometry as { type: "Polygon"; coordinates: number[][][] } | null
						}
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

					{/* Show editable postal codes if zone was created from them */}
					{zone?.creationMethod === "POSTAL_CODE" && (
						<div className="space-y-4 rounded-lg border p-4">
							<div className="flex items-center justify-between">
								<Label className="text-base font-medium">
									{t("pricing.zones.postalCodes.editTitle")}
								</Label>
							</div>
							
							{/* Postal Code Input for editing */}
							<PostalCodeInput
								value={postalCodes}
								onChange={setPostalCodes}
								maxCodes={20}
							/>

							{/* Reload Geometry Button */}
							{postalCodes.length > 0 && (
								<Button
									type="button"
									variant="outline"
									onClick={fetchPostalCodeGeometry}
									disabled={isLoadingGeometry}
									className="w-full"
								>
									{isLoadingGeometry && (
										<Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
									)}
									{t("pricing.zones.postalCodes.reloadGeometry")}
								</Button>
							)}
						</div>
					)}
				</>
			)}

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

			{/* Zone Color */}
			<div className="space-y-2">
				<Label>{t("pricing.zones.form.color")}</Label>
				<div className="flex flex-wrap items-center gap-2">
					{ZONE_COLORS.map((color) => (
						<button
							key={color.value}
							type="button"
							className={`h-8 w-8 rounded-full border-2 transition-all hover:scale-110 ${
								formData.color === color.value
									? "border-foreground ring-2 ring-offset-2"
									: "border-transparent"
							}`}
							style={{ backgroundColor: color.value }}
							onClick={() =>
								setFormData((prev) => ({ ...prev, color: color.value }))
							}
							title={color.label}
						/>
					))}
					{/* Custom color picker */}
					<div className="relative">
						<input
							type="color"
							value={formData.color || "#10b981"}
							onChange={(e) =>
								setFormData((prev) => ({ ...prev, color: e.target.value }))
							}
							className="absolute inset-0 h-8 w-8 cursor-pointer opacity-0"
							title={t("pricing.zones.form.customColor")}
						/>
						<div
							className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all hover:scale-110 ${
								!ZONE_COLORS.some((c) => c.value === formData.color)
									? "border-foreground ring-2 ring-offset-2"
									: "border-muted-foreground/50"
							}`}
							style={{
								background: !ZONE_COLORS.some((c) => c.value === formData.color)
									? formData.color || "#10b981"
									: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
							}}
						>
							{ZONE_COLORS.some((c) => c.value === formData.color) && (
								<span className="text-white text-xs font-bold drop-shadow">+</span>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Story 11.3: Zone Pricing Multiplier */}
			<div className="space-y-4 rounded-lg border p-4 bg-muted/30">
				<div className="space-y-2">
					<Label htmlFor="priceMultiplier" className="text-base font-medium">
						{t("pricing.zones.form.priceMultiplier")}
					</Label>
					<p className="text-muted-foreground text-sm">
						{t("pricing.zones.form.priceMultiplierHelp")}
					</p>
					<div className="flex items-center gap-4">
						<Input
							id="priceMultiplier"
							type="number"
							min={0.5}
							max={3.0}
							step={0.1}
							value={formData.priceMultiplier ?? 1.0}
							onChange={(e) => {
								const value = parseFloat(e.target.value);
								if (!Number.isNaN(value) && value >= 0.5 && value <= 3.0) {
									setFormData((prev) => ({ ...prev, priceMultiplier: value }));
								}
							}}
							className="w-24"
						/>
						<span className="text-lg font-semibold text-muted-foreground">×</span>
						<div className="flex-1">
							<input
								type="range"
								min={0.5}
								max={3.0}
								step={0.1}
								value={formData.priceMultiplier ?? 1.0}
								onChange={(e) => {
									const value = parseFloat(e.target.value);
									setFormData((prev) => ({ ...prev, priceMultiplier: value }));
								}}
								className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
							/>
							<div className="flex justify-between text-xs text-muted-foreground mt-1">
								<span>0.5×</span>
								<span>1.0×</span>
								<span>1.5×</span>
								<span>2.0×</span>
								<span>2.5×</span>
								<span>3.0×</span>
							</div>
						</div>
					</div>
				</div>
				<div className="space-y-2">
					<Label htmlFor="multiplierDescription">
						{t("pricing.zones.form.multiplierDescription")}
					</Label>
					<Input
						id="multiplierDescription"
						value={formData.multiplierDescription ?? ""}
						onChange={(e) =>
							setFormData((prev) => ({
								...prev,
								multiplierDescription: e.target.value || null,
							}))
						}
						placeholder={t("pricing.zones.form.multiplierDescriptionPlaceholder")}
					/>
				</div>
			</div>

			{/* Active Status */}
			<div className="flex items-center justify-between">
				<div className="space-y-0.5">
					<Label>{t("pricing.zones.form.isActive")}</Label>
					<p className="text-muted-foreground text-sm">
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
			<div className="flex justify-end gap-3 border-t pt-4">
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
