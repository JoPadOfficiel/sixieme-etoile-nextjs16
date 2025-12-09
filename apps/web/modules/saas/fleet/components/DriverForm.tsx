"use client";

import { Badge } from "@ui/components/badge";
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
import { apiClient } from "@shared/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, PlusIcon, TrashIcon, ShieldCheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useMemo } from "react";
import { useToast } from "@ui/hooks/use-toast";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import type {
	DriverWithLicenses,
	DriverFormData,
	DriverEmploymentStatus,
	LicenseCategoriesResponse,
	DriverLicenseFormData,
	DriverLicenseWithCategory,
} from "../types";

interface DriverFormProps {
	driver?: DriverWithLicenses | null;
	onSuccess: () => void;
	onCancel: () => void;
}

function getInitialFormData(driver?: DriverWithLicenses | null): DriverFormData {
	if (driver) {
		return {
			firstName: driver.firstName,
			lastName: driver.lastName,
			email: driver.email,
			phone: driver.phone,
			employmentStatus: driver.employmentStatus,
			hourlyCost: driver.hourlyCost ? Number.parseFloat(driver.hourlyCost) : null,
			isActive: driver.isActive,
			notes: driver.notes,
		};
	}
	return {
		firstName: "",
		lastName: "",
		email: null,
		phone: null,
		employmentStatus: "EMPLOYEE",
		hourlyCost: null,
		isActive: true,
		notes: null,
	};
}

export function DriverForm({ driver, onSuccess, onCancel }: DriverFormProps) {
	const t = useTranslations();
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const { isSessionSynced } = useActiveOrganization();

	const initialData = useMemo(() => getInitialFormData(driver), [driver]);
	const [formData, setFormData] = useState<DriverFormData>(initialData);
	const [licenses, setLicenses] = useState<DriverLicenseWithCategory[]>(
		driver?.driverLicenses || []
	);
	const [newLicense, setNewLicense] = useState<DriverLicenseFormData | null>(null);

	// Fetch license categories
	const { data: categoriesData } = useQuery({
		queryKey: ["license-categories"],
		queryFn: async () => {
			const response = await apiClient.vtc["license-categories"].$get({
				query: { limit: "100" },
			});
			if (!response.ok) throw new Error("Failed to fetch license categories");
			return response.json() as Promise<LicenseCategoriesResponse>;
		},
		enabled: isSessionSynced,
	});

	const createMutation = useMutation({
		mutationFn: async (data: DriverFormData) => {
			const response = await apiClient.vtc.drivers.$post({
				json: data,
			});
			if (!response.ok) {
				throw new Error("Failed to create driver");
			}
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["drivers"] });
			toast({ title: t("fleet.drivers.notifications.created") });
			onSuccess();
		},
		onError: () => {
			toast({ title: t("fleet.drivers.notifications.createFailed"), variant: "error" });
		},
	});

	const updateMutation = useMutation({
		mutationFn: async (data: DriverFormData) => {
			if (!driver) return;
			const response = await apiClient.vtc.drivers[":id"].$patch({
				param: { id: driver.id },
				json: data,
			});
			if (!response.ok) {
				throw new Error("Failed to update driver");
			}
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["drivers"] });
			toast({ title: t("fleet.drivers.notifications.updated") });
			onSuccess();
		},
		onError: () => {
			toast({ title: t("fleet.drivers.notifications.updateFailed"), variant: "error" });
		},
	});

	const addLicenseMutation = useMutation({
		mutationFn: async (data: DriverLicenseFormData) => {
			if (!driver) throw new Error("Driver must exist to add license");
			const response = await apiClient.vtc.drivers[":id"].licenses.$post({
				param: { id: driver.id },
				json: {
					licenseCategoryId: data.licenseCategoryId,
					licenseNumber: data.licenseNumber,
					validFrom: data.validFrom,
					validTo: data.validTo ?? null,
				},
			});
			if (!response.ok) {
				throw new Error("Failed to add license");
			}
			return response.json();
		},
		onSuccess: (newLicenseData) => {
			queryClient.invalidateQueries({ queryKey: ["drivers"] });
			setLicenses((prev) => [...prev, newLicenseData as DriverLicenseWithCategory]);
			setNewLicense(null);
			toast({ title: t("fleet.drivers.notifications.licenseAdded") });
		},
		onError: () => {
			toast({ title: t("fleet.drivers.notifications.licenseAddFailed"), variant: "error" });
		},
	});

	const removeLicenseMutation = useMutation({
		mutationFn: async (licenseId: string) => {
			if (!driver) throw new Error("Driver must exist to remove license");
			const response = await apiClient.vtc.drivers[":id"].licenses[":licenseId"].$delete({
				param: { id: driver.id, licenseId },
			});
			if (!response.ok) {
				throw new Error("Failed to remove license");
			}
			return licenseId;
		},
		onSuccess: (removedId) => {
			queryClient.invalidateQueries({ queryKey: ["drivers"] });
			setLicenses((prev) => prev.filter((l) => l.id !== removedId));
			toast({ title: t("fleet.drivers.notifications.licenseRemoved") });
		},
		onError: () => {
			toast({ title: t("fleet.drivers.notifications.licenseRemoveFailed"), variant: "error" });
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (driver) {
			updateMutation.mutate(formData);
		} else {
			createMutation.mutate(formData);
		}
	};

	const handleAddLicense = () => {
		if (newLicense && driver) {
			addLicenseMutation.mutate(newLicense);
		}
	};

	const isPending = createMutation.isPending || updateMutation.isPending;

	const updateField = <K extends keyof DriverFormData>(
		field: K,
		value: DriverFormData[K]
	) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	// Get available categories (not already assigned)
	const availableCategories = categoriesData?.data.filter(
		(cat) => !licenses.some((l) => l.licenseCategoryId === cat.id)
	);

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Personal Information */}
			<div className="space-y-4">
				<h3 className="text-sm font-medium">{t("fleet.drivers.form.personalInfo")}</h3>
				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor="firstName">{t("fleet.drivers.form.firstName")} *</Label>
						<Input
							id="firstName"
							value={formData.firstName}
							onChange={(e) => updateField("firstName", e.target.value)}
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="lastName">{t("fleet.drivers.form.lastName")} *</Label>
						<Input
							id="lastName"
							value={formData.lastName}
							onChange={(e) => updateField("lastName", e.target.value)}
							required
						/>
					</div>
				</div>
				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor="email">{t("fleet.drivers.form.email")}</Label>
						<Input
							id="email"
							type="email"
							value={formData.email || ""}
							onChange={(e) => updateField("email", e.target.value || null)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="phone">{t("fleet.drivers.form.phone")}</Label>
						<Input
							id="phone"
							value={formData.phone || ""}
							onChange={(e) => updateField("phone", e.target.value || null)}
						/>
					</div>
				</div>
			</div>

			{/* Employment Information */}
			<div className="space-y-4">
				<h3 className="text-sm font-medium">{t("fleet.drivers.form.employmentInfo")}</h3>
				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor="employmentStatus">{t("fleet.drivers.form.employmentStatus")}</Label>
						<Select
							value={formData.employmentStatus}
							onValueChange={(value) => updateField("employmentStatus", value as DriverEmploymentStatus)}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="EMPLOYEE">{t("fleet.drivers.employmentStatus.employee")}</SelectItem>
								<SelectItem value="CONTRACTOR">{t("fleet.drivers.employmentStatus.contractor")}</SelectItem>
								<SelectItem value="FREELANCE">{t("fleet.drivers.employmentStatus.freelance")}</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="hourlyCost">{t("fleet.drivers.form.hourlyCost")}</Label>
						<Input
							id="hourlyCost"
							type="number"
							step="0.01"
							min={0}
							value={formData.hourlyCost ?? ""}
							onChange={(e) =>
								updateField("hourlyCost", e.target.value ? Number.parseFloat(e.target.value) : null)
							}
							placeholder="25.00"
						/>
					</div>
				</div>
				<div className="flex items-center space-x-2">
					<Switch
						id="isActive"
						checked={formData.isActive}
						onCheckedChange={(checked) => updateField("isActive", checked)}
					/>
					<Label htmlFor="isActive">{t("fleet.drivers.form.isActive")}</Label>
				</div>
			</div>

			{/* Licenses Section (only for existing drivers) */}
			{driver && (
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h3 className="text-sm font-medium">{t("fleet.drivers.form.licenses")}</h3>
						{!newLicense && availableCategories && availableCategories.length > 0 && (
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() =>
									setNewLicense({
										licenseCategoryId: "",
										licenseNumber: "",
										validFrom: new Date(),
										validTo: null,
									})
								}
							>
								<PlusIcon className="size-4 mr-1" />
								{t("fleet.drivers.form.addLicense")}
							</Button>
						)}
					</div>

					{/* Existing Licenses */}
					<div className="space-y-2">
						{licenses.length === 0 && !newLicense ? (
							<p className="text-sm text-muted-foreground">{t("fleet.drivers.noLicenses")}</p>
						) : (
							licenses.map((license) => (
								<div
									key={license.id}
									className="flex items-center justify-between p-3 border rounded-md"
								>
									<div className="flex items-center gap-3">
										<Badge variant="outline" className="flex items-center gap-1">
											<ShieldCheckIcon className="size-3" />
											{license.licenseCategory.code}
										</Badge>
										<span className="text-sm">{license.licenseCategory.name}</span>
										<span className="text-sm text-muted-foreground">
											#{license.licenseNumber}
										</span>
									</div>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => removeLicenseMutation.mutate(license.id)}
										disabled={removeLicenseMutation.isPending}
									>
										<TrashIcon className="size-4 text-destructive" />
									</Button>
								</div>
							))
						)}
					</div>

					{/* New License Form */}
					{newLicense && (
						<div className="p-4 border rounded-md space-y-4 bg-muted/50">
							<h4 className="text-sm font-medium">{t("fleet.drivers.form.newLicense")}</h4>
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label>{t("fleet.drivers.form.licenseCategory")} *</Label>
									<Select
										value={newLicense.licenseCategoryId}
										onValueChange={(value) =>
											setNewLicense((prev) => prev && { ...prev, licenseCategoryId: value })
										}
									>
										<SelectTrigger>
											<SelectValue placeholder={t("fleet.drivers.form.selectCategory")} />
										</SelectTrigger>
										<SelectContent>
											{availableCategories?.map((cat) => (
												<SelectItem key={cat.id} value={cat.id}>
													{cat.code} - {cat.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label>{t("fleet.drivers.form.licenseNumber")} *</Label>
									<Input
										value={newLicense.licenseNumber}
										onChange={(e) =>
											setNewLicense((prev) => prev && { ...prev, licenseNumber: e.target.value })
										}
										placeholder="12345678"
									/>
								</div>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label>{t("fleet.drivers.form.validFrom")} *</Label>
									<Input
										type="date"
										value={newLicense.validFrom.toISOString().split("T")[0]}
										onChange={(e) =>
											setNewLicense((prev) => prev && { ...prev, validFrom: new Date(e.target.value) })
										}
									/>
								</div>
								<div className="space-y-2">
									<Label>{t("fleet.drivers.form.validTo")}</Label>
									<Input
										type="date"
										value={newLicense.validTo?.toISOString().split("T")[0] || ""}
										onChange={(e) =>
											setNewLicense((prev) =>
												prev && { ...prev, validTo: e.target.value ? new Date(e.target.value) : null }
											)
										}
									/>
								</div>
							</div>
							<div className="flex justify-end gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setNewLicense(null)}
								>
									{t("common.confirmation.cancel")}
								</Button>
								<Button
									type="button"
									size="sm"
									onClick={handleAddLicense}
									disabled={
										!newLicense.licenseCategoryId ||
										!newLicense.licenseNumber ||
										addLicenseMutation.isPending
									}
								>
									{addLicenseMutation.isPending && (
										<Loader2Icon className="size-4 mr-1 animate-spin" />
									)}
									{t("fleet.drivers.form.saveLicense")}
								</Button>
							</div>
						</div>
					)}
				</div>
			)}

			{/* Notes */}
			<div className="space-y-2">
				<Label htmlFor="notes">{t("fleet.drivers.form.notes")}</Label>
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
					disabled={isPending || !formData.firstName || !formData.lastName}
				>
					{isPending && <Loader2Icon className="size-4 mr-2 animate-spin" />}
					{driver ? t("fleet.drivers.form.update") : t("fleet.drivers.form.create")}
				</Button>
			</div>
		</form>
	);
}
