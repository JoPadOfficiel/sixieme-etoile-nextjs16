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
import { Textarea } from "@ui/components/textarea";
import { apiClient } from "@shared/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useMemo } from "react";
import { useToast } from "@ui/hooks/use-toast";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import type {
	VehicleWithRelations,
	VehicleFormData,
	VehicleStatus,
	VehicleCategoriesResponse,
	BasesResponse,
} from "../types";

interface VehicleFormProps {
	vehicle?: VehicleWithRelations | null;
	onSuccess: () => void;
	onCancel: () => void;
}

function getInitialFormData(vehicle?: VehicleWithRelations | null): VehicleFormData {
	if (vehicle) {
		return {
			vehicleCategoryId: vehicle.vehicleCategoryId,
			operatingBaseId: vehicle.operatingBaseId,
			registrationNumber: vehicle.registrationNumber,
			internalName: vehicle.internalName,
			vin: vehicle.vin,
			passengerCapacity: vehicle.passengerCapacity,
			luggageCapacity: vehicle.luggageCapacity,
			consumptionLPer100Km: vehicle.consumptionLPer100Km
				? Number.parseFloat(vehicle.consumptionLPer100Km)
				: null,
			averageSpeedKmh: vehicle.averageSpeedKmh,
			costPerKm: vehicle.costPerKm ? Number.parseFloat(vehicle.costPerKm) : null,
			requiredLicenseCategoryId: vehicle.requiredLicenseCategoryId,
			status: vehicle.status,
			notes: vehicle.notes,
		};
	}
	return {
		vehicleCategoryId: "",
		operatingBaseId: "",
		registrationNumber: "",
		internalName: null,
		vin: null,
		passengerCapacity: 4,
		luggageCapacity: null,
		consumptionLPer100Km: null,
		averageSpeedKmh: null,
		costPerKm: null,
		requiredLicenseCategoryId: null,
		status: "ACTIVE",
		notes: null,
	};
}

export function VehicleForm({ vehicle, onSuccess, onCancel }: VehicleFormProps) {
	const t = useTranslations();
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const { isSessionSynced } = useActiveOrganization();

	const initialData = useMemo(() => getInitialFormData(vehicle), [vehicle]);
	const [formData, setFormData] = useState<VehicleFormData>(initialData);

	// Fetch vehicle categories
	const { data: categoriesData } = useQuery({
		queryKey: ["vehicle-categories"],
		queryFn: async () => {
			const response = await apiClient.vtc["vehicle-categories"].$get({
				query: { limit: "100" },
			});
			if (!response.ok) throw new Error("Failed to fetch categories");
			return response.json() as Promise<VehicleCategoriesResponse>;
		},
		enabled: isSessionSynced,
	});

	// Fetch operating bases
	const { data: basesData } = useQuery({
		queryKey: ["bases"],
		queryFn: async () => {
			const response = await apiClient.vtc.bases.$get({
				query: { limit: "100" },
			});
			if (!response.ok) throw new Error("Failed to fetch bases");
			return response.json() as Promise<BasesResponse>;
		},
		enabled: isSessionSynced,
	});

	const createMutation = useMutation({
		mutationFn: async (data: VehicleFormData) => {
			const response = await apiClient.vtc.vehicles.$post({
				json: data,
			});
			if (!response.ok) {
				throw new Error("Failed to create vehicle");
			}
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["vehicles"] });
			toast({ title: t("fleet.vehicles.notifications.created") });
			onSuccess();
		},
		onError: () => {
			toast({ title: t("fleet.vehicles.notifications.createFailed"), variant: "error" });
		},
	});

	const updateMutation = useMutation({
		mutationFn: async (data: VehicleFormData) => {
			if (!vehicle) return;
			const response = await apiClient.vtc.vehicles[":id"].$patch({
				param: { id: vehicle.id },
				json: data,
			});
			if (!response.ok) {
				throw new Error("Failed to update vehicle");
			}
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["vehicles"] });
			toast({ title: t("fleet.vehicles.notifications.updated") });
			onSuccess();
		},
		onError: () => {
			toast({ title: t("fleet.vehicles.notifications.updateFailed"), variant: "error" });
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (vehicle) {
			updateMutation.mutate(formData);
		} else {
			createMutation.mutate(formData);
		}
	};

	const isPending = createMutation.isPending || updateMutation.isPending;

	const updateField = <K extends keyof VehicleFormData>(
		field: K,
		value: VehicleFormData[K]
	) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Vehicle Category */}
			<div className="space-y-2">
				<Label htmlFor="vehicleCategoryId">{t("fleet.vehicles.form.category")} *</Label>
				<Select
					value={formData.vehicleCategoryId}
					onValueChange={(value) => updateField("vehicleCategoryId", value)}
				>
					<SelectTrigger>
						<SelectValue placeholder={t("fleet.vehicles.form.selectCategory")} />
					</SelectTrigger>
					<SelectContent>
						{categoriesData?.data.map((category) => (
							<SelectItem key={category.id} value={category.id}>
								{category.name} ({category.regulatoryCategory})
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Operating Base */}
			<div className="space-y-2">
				<Label htmlFor="operatingBaseId">{t("fleet.vehicles.form.base")} *</Label>
				<Select
					value={formData.operatingBaseId}
					onValueChange={(value) => updateField("operatingBaseId", value)}
				>
					<SelectTrigger>
						<SelectValue placeholder={t("fleet.vehicles.form.selectBase")} />
					</SelectTrigger>
					<SelectContent>
						{basesData?.data.map((base) => (
							<SelectItem key={base.id} value={base.id}>
								{base.name} - {base.city}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Registration & Internal Name */}
			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label htmlFor="registrationNumber">{t("fleet.vehicles.form.registration")} *</Label>
					<Input
						id="registrationNumber"
						value={formData.registrationNumber}
						onChange={(e) => updateField("registrationNumber", e.target.value)}
						placeholder="AB-123-CD"
						required
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="internalName">{t("fleet.vehicles.form.internalName")}</Label>
					<Input
						id="internalName"
						value={formData.internalName || ""}
						onChange={(e) => updateField("internalName", e.target.value || null)}
						placeholder={t("fleet.vehicles.form.internalNamePlaceholder")}
					/>
				</div>
			</div>

			{/* VIN */}
			<div className="space-y-2">
				<Label htmlFor="vin">{t("fleet.vehicles.form.vin")}</Label>
				<Input
					id="vin"
					value={formData.vin || ""}
					onChange={(e) => updateField("vin", e.target.value || null)}
					placeholder="WVWZZZ3CZWE123456"
				/>
			</div>

			{/* Capacity */}
			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label htmlFor="passengerCapacity">{t("fleet.vehicles.form.passengerCapacity")} *</Label>
					<Input
						id="passengerCapacity"
						type="number"
						min={1}
						value={formData.passengerCapacity}
						onChange={(e) => updateField("passengerCapacity", Number.parseInt(e.target.value) || 1)}
						required
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="luggageCapacity">{t("fleet.vehicles.form.luggageCapacity")}</Label>
					<Input
						id="luggageCapacity"
						type="number"
						min={0}
						value={formData.luggageCapacity ?? ""}
						onChange={(e) =>
							updateField("luggageCapacity", e.target.value ? Number.parseInt(e.target.value) : null)
						}
						placeholder={t("fleet.vehicles.form.luggageCapacityPlaceholder")}
					/>
				</div>
			</div>

			{/* Cost Parameters */}
			<div className="space-y-4">
				<h3 className="text-sm font-medium">{t("fleet.vehicles.form.costParameters")}</h3>
				<div className="grid grid-cols-3 gap-4">
					<div className="space-y-2">
						<Label htmlFor="consumptionLPer100Km">{t("fleet.vehicles.form.consumption")}</Label>
						<Input
							id="consumptionLPer100Km"
							type="number"
							step="0.1"
							min={0}
							value={formData.consumptionLPer100Km ?? ""}
							onChange={(e) =>
								updateField(
									"consumptionLPer100Km",
									e.target.value ? Number.parseFloat(e.target.value) : null
								)
							}
							placeholder="8.5"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="averageSpeedKmh">{t("fleet.vehicles.form.averageSpeed")}</Label>
						<Input
							id="averageSpeedKmh"
							type="number"
							min={0}
							value={formData.averageSpeedKmh ?? ""}
							onChange={(e) =>
								updateField("averageSpeedKmh", e.target.value ? Number.parseInt(e.target.value) : null)
							}
							placeholder="85"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="costPerKm">{t("fleet.vehicles.form.costPerKm")}</Label>
						<Input
							id="costPerKm"
							type="number"
							step="0.01"
							min={0}
							value={formData.costPerKm ?? ""}
							onChange={(e) =>
								updateField("costPerKm", e.target.value ? Number.parseFloat(e.target.value) : null)
							}
							placeholder="0.35"
						/>
					</div>
				</div>
			</div>

			{/* Status */}
			<div className="space-y-2">
				<Label htmlFor="status">{t("fleet.vehicles.form.status")}</Label>
				<Select
					value={formData.status}
					onValueChange={(value) => updateField("status", value as VehicleStatus)}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ACTIVE">{t("fleet.vehicles.status.active")}</SelectItem>
						<SelectItem value="MAINTENANCE">{t("fleet.vehicles.status.maintenance")}</SelectItem>
						<SelectItem value="OUT_OF_SERVICE">{t("fleet.vehicles.status.outOfService")}</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Notes */}
			<div className="space-y-2">
				<Label htmlFor="notes">{t("fleet.vehicles.form.notes")}</Label>
				<Textarea
					id="notes"
					value={formData.notes || ""}
					onChange={(e) => updateField("notes", e.target.value || null)}
					rows={3}
				/>
			</div>

			{/* Actions */}
			<div className="flex justify-end gap-3 pt-4 border-t">
				<Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
					{t("common.confirmation.cancel")}
				</Button>
				<Button
					type="submit"
					disabled={isPending || !formData.vehicleCategoryId || !formData.operatingBaseId || !formData.registrationNumber}
				>
					{isPending && <Loader2Icon className="size-4 mr-2 animate-spin" />}
					{vehicle ? t("fleet.vehicles.form.update") : t("fleet.vehicles.form.create")}
				</Button>
			</div>
		</form>
	);
}
