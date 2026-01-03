"use client";

/**
 * SubcontractorForm Component
 * Story 22.4: Implement Complete Subcontracting System
 * Refactored: Subcontractor is now an independent company entity (not linked to Contact)
 */

import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@ui/components/label";
import { Input } from "@ui/components/input";
import { Textarea } from "@ui/components/textarea";
import { Switch } from "@ui/components/switch";
import { Checkbox } from "@ui/components/checkbox";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { Badge } from "@ui/components/badge";
import { X } from "lucide-react";
import { apiClient } from "@shared/lib/api-client";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import type { SubcontractorFormData, ZoneOption, VehicleCategoryOption } from "../types";

interface SubcontractorFormProps {
	mode: "create" | "edit";
	formData: SubcontractorFormData;
	onChange: (data: SubcontractorFormData) => void;
}

export function SubcontractorForm({ mode, formData, onChange }: SubcontractorFormProps) {
	const t = useTranslations("subcontractors");
	const { isSessionSynced } = useActiveOrganization();

	const { data: zonesData } = useQuery({
		queryKey: ["pricing-zones-for-subcontractor"],
		queryFn: async () => {
			const response = await fetch("/api/vtc/pricing/zones?limit=100");
			if (!response.ok) throw new Error("Failed to fetch zones");
			return response.json();
		},
		enabled: isSessionSynced,
	});

	const { data: categoriesData } = useQuery({
		queryKey: ["vehicle-categories-for-subcontractor"],
		queryFn: async () => {
			const response = await apiClient.vtc["vehicle-categories"].$get({ query: { limit: "100" } });
			if (!response.ok) throw new Error("Failed to fetch vehicle categories");
			return response.json();
		},
		enabled: isSessionSynced,
	});

	const zones: ZoneOption[] = (zonesData?.data ?? []).map((z: { id: string; name: string; code: string }) => ({
		id: z.id, name: z.name, code: z.code,
	}));

	const categories: VehicleCategoryOption[] = (categoriesData?.data ?? []).map((c: { id: string; name: string; code: string }) => ({
		id: c.id, name: c.name, code: c.code,
	}));

	const handleZoneToggle = (zoneId: string) => {
		const newZoneIds = formData.operatingZoneIds.includes(zoneId)
			? formData.operatingZoneIds.filter((id) => id !== zoneId)
			: [...formData.operatingZoneIds, zoneId];
		onChange({ ...formData, operatingZoneIds: newZoneIds });
	};

	const handleCategoryToggle = (categoryId: string) => {
		const newCategoryIds = formData.vehicleCategoryIds.includes(categoryId)
			? formData.vehicleCategoryIds.filter((id) => id !== categoryId)
			: [...formData.vehicleCategoryIds, categoryId];
		onChange({ ...formData, vehicleCategoryIds: newCategoryIds });
	};

	return (
		<div className="space-y-6">
			{/* Company Information */}
			<div className="space-y-4">
				<h4 className="font-medium text-sm text-muted-foreground">{t("form.companyInfo")}</h4>
				<div className="space-y-2">
					<Label htmlFor="companyName">{t("form.companyName")} *</Label>
					<Input
						id="companyName"
						value={formData.companyName}
						onChange={(e) => onChange({ ...formData, companyName: e.target.value })}
						placeholder={t("form.companyNamePlaceholder")}
						required
					/>
				</div>
				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor="siret">{t("form.siret")}</Label>
						<Input
							id="siret"
							value={formData.siret || ""}
							onChange={(e) => onChange({ ...formData, siret: e.target.value || undefined })}
							placeholder="123 456 789 00012"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="vatNumber">{t("form.vatNumber")}</Label>
						<Input
							id="vatNumber"
							value={formData.vatNumber || ""}
							onChange={(e) => onChange({ ...formData, vatNumber: e.target.value || undefined })}
							placeholder="FR12345678901"
						/>
					</div>
				</div>
			</div>

			{/* Contact Details */}
			<div className="space-y-4">
				<h4 className="font-medium text-sm text-muted-foreground">{t("form.contactDetails")}</h4>
				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor="contactName">{t("form.contactName")}</Label>
						<Input
							id="contactName"
							value={formData.contactName || ""}
							onChange={(e) => onChange({ ...formData, contactName: e.target.value || undefined })}
							placeholder={t("form.contactNamePlaceholder")}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="email">{t("form.email")}</Label>
						<Input
							id="email"
							type="email"
							value={formData.email || ""}
							onChange={(e) => onChange({ ...formData, email: e.target.value || undefined })}
							placeholder="contact@company.com"
						/>
					</div>
				</div>
				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor="phone">{t("form.phone")}</Label>
						<Input
							id="phone"
							type="tel"
							value={formData.phone || ""}
							onChange={(e) => onChange({ ...formData, phone: e.target.value || undefined })}
							placeholder="+33 1 23 45 67 89"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="address">{t("form.address")}</Label>
						<Input
							id="address"
							value={formData.address || ""}
							onChange={(e) => onChange({ ...formData, address: e.target.value || undefined })}
							placeholder={t("form.addressPlaceholder")}
						/>
					</div>
				</div>
			</div>

			{/* Coverage */}
			<div className="space-y-4">
				<h4 className="font-medium text-sm text-muted-foreground">{t("form.coverage")}</h4>
				<div className="flex items-center space-x-2">
					<Checkbox
						id="allZones"
						checked={formData.allZones}
						onCheckedChange={(checked) => onChange({ ...formData, allZones: checked === true })}
					/>
					<Label htmlFor="allZones" className="text-sm font-normal">{t("form.allZones")}</Label>
				</div>

				{!formData.allZones && (
					<div className="space-y-2">
						<Label>{t("form.operatingZones")}</Label>
						<Select onValueChange={handleZoneToggle}>
							<SelectTrigger>
								<SelectValue placeholder={t("form.operatingZonesPlaceholder")} />
							</SelectTrigger>
							<SelectContent>
								{zones.filter((z) => !formData.operatingZoneIds.includes(z.id)).map((zone) => (
									<SelectItem key={zone.id} value={zone.id}>{zone.code} - {zone.name}</SelectItem>
								))}
							</SelectContent>
						</Select>
						{formData.operatingZoneIds.length > 0 && (
							<div className="flex flex-wrap gap-1 mt-2">
								{formData.operatingZoneIds.map((zoneId) => {
									const zone = zones.find((z) => z.id === zoneId);
									return zone ? (
										<Badge key={zoneId} variant="secondary" className="gap-1">
											{zone.code}
											<button type="button" onClick={() => handleZoneToggle(zoneId)} className="ml-1 hover:text-destructive">
												<X className="size-3" />
											</button>
										</Badge>
									) : null;
								})}
							</div>
						)}
					</div>
				)}

				<div className="space-y-2">
					<Label>{t("form.vehicleCategories")}</Label>
					<Select onValueChange={handleCategoryToggle}>
						<SelectTrigger>
							<SelectValue placeholder={t("form.vehicleCategoriesPlaceholder")} />
						</SelectTrigger>
						<SelectContent>
							{categories.filter((c) => !formData.vehicleCategoryIds.includes(c.id)).map((cat) => (
								<SelectItem key={cat.id} value={cat.id}>{cat.code} - {cat.name}</SelectItem>
							))}
						</SelectContent>
					</Select>
					{formData.vehicleCategoryIds.length > 0 && (
						<div className="flex flex-wrap gap-1 mt-2">
							{formData.vehicleCategoryIds.map((catId) => {
								const cat = categories.find((c) => c.id === catId);
								return cat ? (
									<Badge key={catId} variant="secondary" className="gap-1">
										{cat.code}
										<button type="button" onClick={() => handleCategoryToggle(catId)} className="ml-1 hover:text-destructive">
											<X className="size-3" />
										</button>
									</Badge>
								) : null;
							})}
						</div>
					)}
				</div>
			</div>

			{/* Rates */}
			<div className="grid grid-cols-3 gap-4">
				<div className="space-y-2">
					<Label htmlFor="ratePerKm">{t("form.ratePerKm")}</Label>
					<Input
						id="ratePerKm"
						type="number"
						step="0.01"
						min="0"
						value={formData.ratePerKm ?? ""}
						onChange={(e) => onChange({ ...formData, ratePerKm: e.target.value ? parseFloat(e.target.value) : null })}
						placeholder="0.00"
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="ratePerHour">{t("form.ratePerHour")}</Label>
					<Input
						id="ratePerHour"
						type="number"
						step="0.01"
						min="0"
						value={formData.ratePerHour ?? ""}
						onChange={(e) => onChange({ ...formData, ratePerHour: e.target.value ? parseFloat(e.target.value) : null })}
						placeholder="0.00"
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="minimumFare">{t("form.minimumFare")}</Label>
					<Input
						id="minimumFare"
						type="number"
						step="0.01"
						min="0"
						value={formData.minimumFare ?? ""}
						onChange={(e) => onChange({ ...formData, minimumFare: e.target.value ? parseFloat(e.target.value) : null })}
						placeholder="0.00"
					/>
				</div>
			</div>

			{/* Notes */}
			<div className="space-y-2">
				<Label htmlFor="notes">{t("form.notes")}</Label>
				<Textarea
					id="notes"
					value={formData.notes ?? ""}
					onChange={(e) => onChange({ ...formData, notes: e.target.value || null })}
					placeholder={t("form.notesPlaceholder")}
					rows={3}
				/>
			</div>

			{/* Active Toggle (edit mode only) */}
			{mode === "edit" && (
				<div className="flex items-center justify-between rounded-lg border p-4">
					<div className="space-y-0.5">
						<Label htmlFor="isActive">{t("form.isActive")}</Label>
						<p className="text-sm text-muted-foreground">{t("form.isActiveDescription")}</p>
					</div>
					<Switch
						id="isActive"
						checked={formData.isActive ?? true}
						onCheckedChange={(checked) => onChange({ ...formData, isActive: checked })}
					/>
				</div>
			)}
		</div>
	);
}
