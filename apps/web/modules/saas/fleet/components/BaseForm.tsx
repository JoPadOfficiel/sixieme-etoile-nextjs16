"use client";

import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { Switch } from "@ui/components/switch";
import { apiClient } from "@shared/lib/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useMemo } from "react";
import { useToast } from "@ui/hooks/use-toast";
import type { OperatingBaseWithCount, OperatingBaseFormData } from "../types";
import { AddressAutocomplete } from "@saas/shared/components/AddressAutocomplete";

interface BaseFormProps {
	base?: OperatingBaseWithCount | null;
	onSuccess: () => void;
	onCancel: () => void;
}

function getInitialFormData(base?: OperatingBaseWithCount | null): OperatingBaseFormData {
	if (base) {
		return {
			name: base.name,
			addressLine1: base.addressLine1,
			addressLine2: base.addressLine2,
			city: base.city,
			postalCode: base.postalCode,
			countryCode: base.countryCode,
			latitude: Number.parseFloat(base.latitude),
			longitude: Number.parseFloat(base.longitude),
			isActive: base.isActive,
		};
	}
	return {
		name: "",
		addressLine1: "",
		addressLine2: null,
		city: "",
		postalCode: "",
		countryCode: "FR",
		latitude: 48.8566, // Paris default
		longitude: 2.3522,
		isActive: true,
	};
}

export function BaseForm({ base, onSuccess, onCancel }: BaseFormProps) {
	const t = useTranslations();
	const { toast } = useToast();
	const queryClient = useQueryClient();

	const initialData = useMemo(() => getInitialFormData(base), [base]);
	const [formData, setFormData] = useState<OperatingBaseFormData>(initialData);

	const createMutation = useMutation({
		mutationFn: async (data: OperatingBaseFormData) => {
			const response = await apiClient.vtc.bases.$post({
				json: data,
			});
			if (!response.ok) {
				throw new Error("Failed to create base");
			}
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["bases"] });
			toast({ title: t("fleet.bases.notifications.created") });
			onSuccess();
		},
		onError: () => {
			toast({ title: t("fleet.bases.notifications.createFailed"), variant: "error" });
		},
	});

	const updateMutation = useMutation({
		mutationFn: async (data: OperatingBaseFormData) => {
			if (!base) return;
			const response = await apiClient.vtc.bases[":id"].$patch({
				param: { id: base.id },
				json: data,
			});
			if (!response.ok) {
				throw new Error("Failed to update base");
			}
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["bases"] });
			toast({ title: t("fleet.bases.notifications.updated") });
			onSuccess();
		},
		onError: () => {
			toast({ title: t("fleet.bases.notifications.updateFailed"), variant: "error" });
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (base) {
			updateMutation.mutate(formData);
		} else {
			createMutation.mutate(formData);
		}
	};

	const isPending = createMutation.isPending || updateMutation.isPending;

	const updateField = <K extends keyof OperatingBaseFormData>(
		field: K,
		value: OperatingBaseFormData[K]
	) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	// Handle address autocomplete selection
	const handleAddressChange = (result: { address: string; latitude: number | null; longitude: number | null }) => {
		// Parse address components to fill individual fields
		const addressParts = result.address.split(',');
		const mainAddress = addressParts[0]?.trim() || "";
		const cityPart = addressParts[addressParts.length - 1]?.trim() || "";
		
		// Extract postal code and city from the last part
		let postalCode = "";
		let city = "";
		const cityMatch = cityPart.match(/(\d{5})\s+(.+)$/);
		if (cityMatch) {
			postalCode = cityMatch[1];
			city = cityMatch[2];
		} else {
			city = cityPart;
		}

		setFormData((prev) => ({
			...prev,
			addressLine1: mainAddress,
			city,
			postalCode,
			latitude: result.latitude ?? 48.8566, // Default to Paris if null
			longitude: result.longitude ?? 2.3522, // Default to Paris if null
		}));
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Name */}
			<div className="space-y-2">
				<Label htmlFor="name">{t("fleet.bases.form.name")} *</Label>
				<Input
					id="name"
					value={formData.name}
					onChange={(e) => updateField("name", e.target.value)}
					placeholder={t("fleet.bases.form.namePlaceholder")}
					required
				/>
			</div>

			{/* Address */}
			<div className="space-y-4">
				<h3 className="text-sm font-medium">{t("fleet.bases.form.addressSection")}</h3>
				
				{/* Address Autocomplete */}
				<AddressAutocomplete
					id="baseAddress"
					label={t("fleet.bases.form.addressAutocomplete")}
					value={`${formData.addressLine1}, ${formData.postalCode} ${formData.city}`}
					onChange={handleAddressChange}
					placeholder={t("fleet.bases.form.addressAutocompletePlaceholder")}
					className="mb-4"
				/>
				
				<div className="space-y-2">
					<Label htmlFor="addressLine1">{t("fleet.bases.form.addressLine1")} *</Label>
					<Input
						id="addressLine1"
						value={formData.addressLine1}
						onChange={(e) => updateField("addressLine1", e.target.value)}
						placeholder={t("fleet.bases.form.addressLine1Placeholder")}
						required
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="addressLine2">{t("fleet.bases.form.addressLine2")}</Label>
					<Input
						id="addressLine2"
						value={formData.addressLine2 || ""}
						onChange={(e) => updateField("addressLine2", e.target.value || null)}
						placeholder={t("fleet.bases.form.addressLine2Placeholder")}
					/>
				</div>
				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor="postalCode">{t("fleet.bases.form.postalCode")} *</Label>
						<Input
							id="postalCode"
							value={formData.postalCode}
							onChange={(e) => updateField("postalCode", e.target.value)}
							placeholder="75001"
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="city">{t("fleet.bases.form.city")} *</Label>
						<Input
							id="city"
							value={formData.city}
							onChange={(e) => updateField("city", e.target.value)}
							placeholder="Paris"
							required
						/>
					</div>
				</div>
			</div>

			{/* Coordinates */}
			<div className="space-y-4">
				<h3 className="text-sm font-medium">{t("fleet.bases.form.coordinatesSection")}</h3>
				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor="latitude">{t("fleet.bases.form.latitude")} *</Label>
						<Input
							id="latitude"
							type="number"
							step="0.0000001"
							min={-90}
							max={90}
							value={formData.latitude}
							onChange={(e) => updateField("latitude", Number.parseFloat(e.target.value) || 0)}
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="longitude">{t("fleet.bases.form.longitude")} *</Label>
						<Input
							id="longitude"
							type="number"
							step="0.0000001"
							min={-180}
							max={180}
							value={formData.longitude}
							onChange={(e) => updateField("longitude", Number.parseFloat(e.target.value) || 0)}
							required
						/>
					</div>
				</div>
				<p className="text-xs text-muted-foreground">
					{t("fleet.bases.form.coordinatesHelp")}
				</p>
			</div>

			{/* Active Toggle */}
			<div className="flex items-center justify-between rounded-lg border p-4">
				<div className="space-y-0.5">
					<Label htmlFor="isActive">{t("fleet.bases.form.isActive")}</Label>
					<p className="text-sm text-muted-foreground">
						{t("fleet.bases.form.isActiveDescription")}
					</p>
				</div>
				<Switch
					id="isActive"
					checked={formData.isActive}
					onCheckedChange={(checked: boolean) => updateField("isActive", checked)}
				/>
			</div>

			{/* Actions */}
			<div className="flex justify-end gap-3 pt-4 border-t">
				<Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
					{t("common.confirmation.cancel")}
				</Button>
				<Button
					type="submit"
					disabled={
						isPending ||
						!formData.name ||
						!formData.addressLine1 ||
						!formData.city ||
						!formData.postalCode
					}
				>
					{isPending && <Loader2Icon className="size-4 mr-2 animate-spin" />}
					{base ? t("fleet.bases.form.update") : t("fleet.bases.form.create")}
				</Button>
			</div>
		</form>
	);
}
