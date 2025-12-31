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
	DepreciationMethod,
} from "../types";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@ui/components/collapsible";
import { ChevronDownIcon, InfoIcon } from "lucide-react";

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
			// Story 17.14: TCO fields
			purchasePrice: vehicle.purchasePrice ? Number.parseFloat(vehicle.purchasePrice) : null,
			expectedLifespanKm: vehicle.expectedLifespanKm,
			expectedLifespanYears: vehicle.expectedLifespanYears,
			annualMaintenanceBudget: vehicle.annualMaintenanceBudget
				? Number.parseFloat(vehicle.annualMaintenanceBudget)
				: null,
			annualInsuranceCost: vehicle.annualInsuranceCost
				? Number.parseFloat(vehicle.annualInsuranceCost)
				: null,
			depreciationMethod: vehicle.depreciationMethod,
			currentOdometerKm: vehicle.currentOdometerKm,
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
		// Story 17.14: TCO fields
		purchasePrice: null,
		expectedLifespanKm: null,
		expectedLifespanYears: null,
		annualMaintenanceBudget: null,
		annualInsuranceCost: null,
		depreciationMethod: null,
		currentOdometerKm: null,
	};
}

// Story 17.14: Calculate TCO preview
function calculateTcoPreview(formData: VehicleFormData): {
	totalPerKm: number | null;
	depreciation: number | null;
	maintenance: number | null;
	insurance: number | null;
} {
	const { purchasePrice, expectedLifespanKm, expectedLifespanYears, annualMaintenanceBudget, annualInsuranceCost } = formData;
	
	if (!purchasePrice || !expectedLifespanKm || !expectedLifespanYears || expectedLifespanKm <= 0 || expectedLifespanYears <= 0) {
		return { totalPerKm: null, depreciation: null, maintenance: null, insurance: null };
	}
	
	const depreciation = purchasePrice / expectedLifespanKm;
	const annualKm = expectedLifespanKm / expectedLifespanYears;
	const maintenance = (annualMaintenanceBudget ?? 0) / annualKm;
	const insurance = (annualInsuranceCost ?? 0) / annualKm;
	const totalPerKm = depreciation + maintenance + insurance;
	
	return {
		totalPerKm: Math.round(totalPerKm * 10000) / 10000,
		depreciation: Math.round(depreciation * 10000) / 10000,
		maintenance: Math.round(maintenance * 10000) / 10000,
		insurance: Math.round(insurance * 10000) / 10000,
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

			{/* Story 17.14: TCO Configuration */}
			<Collapsible defaultOpen={!!formData.purchasePrice}>
				<CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:underline">
					<div className="flex items-center gap-2">
						<span>{t("fleet.vehicles.form.tco.title")}</span>
						{formData.purchasePrice && (
							<span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
								{calculateTcoPreview(formData).totalPerKm?.toFixed(4)} €/km
							</span>
						)}
					</div>
					<ChevronDownIcon className="size-4 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
				</CollapsibleTrigger>
				<CollapsibleContent className="space-y-4 pt-2">
					<p className="text-xs text-muted-foreground flex items-start gap-1">
						<InfoIcon className="size-3 mt-0.5 shrink-0" />
						{t("fleet.vehicles.form.tco.description")}
					</p>

					{/* Purchase Price & Lifespan */}
					<div className="grid grid-cols-3 gap-4">
						<div className="space-y-2">
							<Label htmlFor="purchasePrice">{t("fleet.vehicles.form.tco.purchasePrice")}</Label>
							<Input
								id="purchasePrice"
								type="number"
								step="100"
								min={0}
								value={formData.purchasePrice ?? ""}
								onChange={(e) =>
									updateField("purchasePrice", e.target.value ? Number.parseFloat(e.target.value) : null)
								}
								placeholder={t("fleet.vehicles.form.tco.purchasePricePlaceholder")}
							/>
							<p className="text-xs text-muted-foreground">{t("fleet.vehicles.form.tco.purchasePriceHelp")}</p>
						</div>
						<div className="space-y-2">
							<Label htmlFor="expectedLifespanKm">{t("fleet.vehicles.form.tco.expectedLifespanKm")}</Label>
							<Input
								id="expectedLifespanKm"
								type="number"
								step="10000"
								min={0}
								value={formData.expectedLifespanKm ?? ""}
								onChange={(e) =>
									updateField("expectedLifespanKm", e.target.value ? Number.parseInt(e.target.value) : null)
								}
								placeholder={t("fleet.vehicles.form.tco.expectedLifespanKmPlaceholder")}
							/>
							<p className="text-xs text-muted-foreground">{t("fleet.vehicles.form.tco.expectedLifespanKmHelp")}</p>
						</div>
						<div className="space-y-2">
							<Label htmlFor="expectedLifespanYears">{t("fleet.vehicles.form.tco.expectedLifespanYears")}</Label>
							<Input
								id="expectedLifespanYears"
								type="number"
								min={1}
								max={20}
								value={formData.expectedLifespanYears ?? ""}
								onChange={(e) =>
									updateField("expectedLifespanYears", e.target.value ? Number.parseInt(e.target.value) : null)
								}
								placeholder={t("fleet.vehicles.form.tco.expectedLifespanYearsPlaceholder")}
							/>
							<p className="text-xs text-muted-foreground">{t("fleet.vehicles.form.tco.expectedLifespanYearsHelp")}</p>
						</div>
					</div>

					{/* Maintenance & Insurance */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="annualMaintenanceBudget">{t("fleet.vehicles.form.tco.annualMaintenanceBudget")}</Label>
							<Input
								id="annualMaintenanceBudget"
								type="number"
								step="100"
								min={0}
								value={formData.annualMaintenanceBudget ?? ""}
								onChange={(e) =>
									updateField("annualMaintenanceBudget", e.target.value ? Number.parseFloat(e.target.value) : null)
								}
								placeholder={t("fleet.vehicles.form.tco.annualMaintenanceBudgetPlaceholder")}
							/>
							<p className="text-xs text-muted-foreground">{t("fleet.vehicles.form.tco.annualMaintenanceBudgetHelp")}</p>
						</div>
						<div className="space-y-2">
							<Label htmlFor="annualInsuranceCost">{t("fleet.vehicles.form.tco.annualInsuranceCost")}</Label>
							<Input
								id="annualInsuranceCost"
								type="number"
								step="100"
								min={0}
								value={formData.annualInsuranceCost ?? ""}
								onChange={(e) =>
									updateField("annualInsuranceCost", e.target.value ? Number.parseFloat(e.target.value) : null)
								}
								placeholder={t("fleet.vehicles.form.tco.annualInsuranceCostPlaceholder")}
							/>
							<p className="text-xs text-muted-foreground">{t("fleet.vehicles.form.tco.annualInsuranceCostHelp")}</p>
						</div>
					</div>

					{/* Depreciation Method & Odometer */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="depreciationMethod">{t("fleet.vehicles.form.tco.depreciationMethod")}</Label>
							<Select
								value={formData.depreciationMethod ?? ""}
								onValueChange={(value) => updateField("depreciationMethod", value as DepreciationMethod || null)}
							>
								<SelectTrigger>
									<SelectValue placeholder={t("fleet.vehicles.form.tco.selectDepreciationMethod")} />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="LINEAR">{t("fleet.vehicles.form.tco.depreciationLinear")}</SelectItem>
									<SelectItem value="DECLINING_BALANCE">{t("fleet.vehicles.form.tco.depreciationDecliningBalance")}</SelectItem>
								</SelectContent>
							</Select>
							<p className="text-xs text-muted-foreground">{t("fleet.vehicles.form.tco.depreciationHelp")}</p>
						</div>
						<div className="space-y-2">
							<Label htmlFor="currentOdometerKm">{t("fleet.vehicles.form.tco.currentOdometerKm")}</Label>
							<Input
								id="currentOdometerKm"
								type="number"
								step="1000"
								min={0}
								value={formData.currentOdometerKm ?? ""}
								onChange={(e) =>
									updateField("currentOdometerKm", e.target.value ? Number.parseInt(e.target.value) : null)
								}
								placeholder={t("fleet.vehicles.form.tco.currentOdometerKmPlaceholder")}
							/>
							<p className="text-xs text-muted-foreground">{t("fleet.vehicles.form.tco.currentOdometerKmHelp")}</p>
						</div>
					</div>

					{/* TCO Preview */}
					{(() => {
						const preview = calculateTcoPreview(formData);
						if (preview.totalPerKm !== null) {
							return (
								<div className="bg-muted/50 rounded-lg p-4 space-y-2">
									<h4 className="text-sm font-medium">{t("fleet.vehicles.form.tco.preview.title")}</h4>
									<div className="grid grid-cols-4 gap-4 text-sm">
										<div>
											<span className="text-muted-foreground">{t("fleet.vehicles.form.tco.preview.depreciation")}</span>
											<p className="font-mono">{preview.depreciation?.toFixed(4)} €{t("fleet.vehicles.form.tco.preview.perKm")}</p>
										</div>
										<div>
											<span className="text-muted-foreground">{t("fleet.vehicles.form.tco.preview.maintenance")}</span>
											<p className="font-mono">{preview.maintenance?.toFixed(4)} €{t("fleet.vehicles.form.tco.preview.perKm")}</p>
										</div>
										<div>
											<span className="text-muted-foreground">{t("fleet.vehicles.form.tco.preview.insurance")}</span>
											<p className="font-mono">{preview.insurance?.toFixed(4)} €{t("fleet.vehicles.form.tco.preview.perKm")}</p>
										</div>
										<div className="font-semibold">
											<span className="text-muted-foreground">{t("fleet.vehicles.form.tco.preview.totalPerKm")}</span>
											<p className="font-mono text-primary">{preview.totalPerKm?.toFixed(4)} €{t("fleet.vehicles.form.tco.preview.perKm")}</p>
										</div>
									</div>
								</div>
							);
						}
						return (
							<p className="text-xs text-muted-foreground italic">
								{t("fleet.vehicles.form.tco.notConfigured")}
							</p>
						);
					})()}
				</CollapsibleContent>
			</Collapsible>

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
