"use client";

import { Alert, AlertDescription, AlertTitle } from "@ui/components/alert";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@ui/components/table";
import { Textarea } from "@ui/components/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/components/tabs";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { apiClient } from "@shared/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@ui/hooks/use-toast";
import {
	AlertTriangleIcon,
	CarIcon,
	CheckCircleIcon,
	Loader2Icon,
	PencilIcon,
	PlusIcon,
	SettingsIcon,
	ShieldCheckIcon,
	TrashIcon,
	XCircleIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import type {
	ConfigHealthResponse,
	LicenseCategoriesResponse,
	LicenseCategoryFormData,
	LicenseCategoryWithCount,
	LicenseRulesResponse,
	LicenseRuleFormData,
	OrganizationLicenseRuleWithCategory,
	OrganizationPricingSettings,
	PricingSettingsFormData,
	VehicleCategoriesResponse,
	VehicleCategoryFormData,
	VehicleCategoryWithCount,
	VehicleRegulatoryCategory,
} from "@saas/fleet/types";

const VALID_TABS = ["vehicle-categories", "cost-parameters", "license-categories", "rse-rules"] as const;
type TabValue = (typeof VALID_TABS)[number];

export default function SettingsFleetPage() {
	const t = useTranslations();
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();

	// Get tab from URL or default to vehicle-categories
	const tabParam = searchParams.get("tab");
	const currentTab: TabValue = VALID_TABS.includes(tabParam as TabValue)
		? (tabParam as TabValue)
		: "vehicle-categories";

	const handleTabChange = (value: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("tab", value);
		router.push(`${pathname}?${params.toString()}`);
	};

	return (
		<div className="container py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold tracking-tight">
					{t("fleet.settings.title")}
				</h1>
				<p className="text-muted-foreground mt-2">
					{t("fleet.settings.description")}
				</p>
			</div>

			{/* Configuration Health Summary */}
			<ConfigHealthSummary />

			<Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
				<TabsList className="grid w-full grid-cols-4">
					<TabsTrigger value="vehicle-categories">
						{t("fleet.settings.tabs.vehicleCategories")}
					</TabsTrigger>
					<TabsTrigger value="cost-parameters">
						{t("fleet.settings.tabs.costParameters")}
					</TabsTrigger>
					<TabsTrigger value="license-categories">
						{t("fleet.settings.tabs.licenseCategories")}
					</TabsTrigger>
					<TabsTrigger value="rse-rules">
						{t("fleet.settings.tabs.rseRules")}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="vehicle-categories">
					<VehicleCategoriesSection />
				</TabsContent>

				<TabsContent value="cost-parameters">
					<CostParametersSection />
				</TabsContent>

				<TabsContent value="license-categories">
					<LicenseCategoriesSection />
				</TabsContent>

				<TabsContent value="rse-rules">
					<LicenseRulesSection />
				</TabsContent>
			</Tabs>
		</div>
	);
}

// License Categories Section
function LicenseCategoriesSection() {
	const t = useTranslations();
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const { isSessionSynced } = useActiveOrganization();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingCategory, setEditingCategory] = useState<LicenseCategoryWithCount | null>(null);
	const [formData, setFormData] = useState<LicenseCategoryFormData>({
		code: "",
		name: "",
		description: null,
	});

	const { data, isLoading } = useQuery({
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
		mutationFn: async (data: LicenseCategoryFormData) => {
			const response = await apiClient.vtc["license-categories"].$post({
				json: data,
			});
			if (!response.ok) throw new Error("Failed to create license category");
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["license-categories"] });
			toast({ title: t("fleet.settings.notifications.categoryCreated") });
			handleCloseDialog();
		},
		onError: () => {
			toast({ title: t("fleet.settings.notifications.categoryCreateFailed"), variant: "error" });
		},
	});

	const updateMutation = useMutation({
		mutationFn: async ({ id, data }: { id: string; data: LicenseCategoryFormData }) => {
			const response = await apiClient.vtc["license-categories"][":id"].$patch({
				param: { id },
				json: data,
			});
			if (!response.ok) throw new Error("Failed to update license category");
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["license-categories"] });
			toast({ title: t("fleet.settings.notifications.categoryUpdated") });
			handleCloseDialog();
		},
		onError: () => {
			toast({ title: t("fleet.settings.notifications.categoryUpdateFailed"), variant: "error" });
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			const response = await apiClient.vtc["license-categories"][":id"].$delete({
				param: { id },
			});
			if (!response.ok) throw new Error("Failed to delete license category");
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["license-categories"] });
			toast({ title: t("fleet.settings.notifications.categoryDeleted") });
		},
		onError: () => {
			toast({ title: t("fleet.settings.notifications.categoryDeleteFailed"), variant: "error" });
		},
	});

	const handleOpenCreate = () => {
		setEditingCategory(null);
		setFormData({ code: "", name: "", description: null });
		setDialogOpen(true);
	};

	const handleOpenEdit = (category: LicenseCategoryWithCount) => {
		setEditingCategory(category);
		setFormData({
			code: category.code,
			name: category.name,
			description: category.description,
		});
		setDialogOpen(true);
	};

	const handleCloseDialog = () => {
		setDialogOpen(false);
		setEditingCategory(null);
		setFormData({ code: "", name: "", description: null });
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (editingCategory) {
			updateMutation.mutate({ id: editingCategory.id, data: formData });
		} else {
			createMutation.mutate(formData);
		}
	};

	const isPending = createMutation.isPending || updateMutation.isPending;

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<div>
					<CardTitle>{t("fleet.settings.licenseCategories.title")}</CardTitle>
					<CardDescription>
						{t("fleet.settings.licenseCategories.description")}
					</CardDescription>
				</div>
				<Button onClick={handleOpenCreate}>
					<PlusIcon className="size-4 mr-2" />
					{t("fleet.settings.licenseCategories.add")}
				</Button>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="flex items-center justify-center py-8">
						<Loader2Icon className="size-6 animate-spin text-muted-foreground" />
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{t("fleet.settings.licenseCategories.columns.code")}</TableHead>
								<TableHead>{t("fleet.settings.licenseCategories.columns.name")}</TableHead>
								<TableHead>{t("fleet.settings.licenseCategories.columns.description")}</TableHead>
								<TableHead className="text-center">{t("fleet.settings.licenseCategories.columns.drivers")}</TableHead>
								<TableHead className="text-center">{t("fleet.settings.licenseCategories.columns.vehicles")}</TableHead>
								<TableHead className="w-[100px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data?.data.length === 0 ? (
								<TableRow>
									<TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
										{t("fleet.settings.licenseCategories.empty")}
									</TableCell>
								</TableRow>
							) : (
								data?.data.map((category) => (
									<TableRow key={category.id}>
										<TableCell>
											<Badge variant="outline" className="flex items-center gap-1 w-fit">
												<ShieldCheckIcon className="size-3" />
												{category.code}
											</Badge>
										</TableCell>
										<TableCell className="font-medium">{category.name}</TableCell>
										<TableCell className="text-muted-foreground max-w-[200px] truncate">
											{category.description || "-"}
										</TableCell>
										<TableCell className="text-center">{category._count.driverLicenses}</TableCell>
										<TableCell className="text-center">{category._count.vehiclesRequiringThis}</TableCell>
										<TableCell>
											<div className="flex items-center gap-1">
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleOpenEdit(category)}
												>
													<PencilIcon className="size-4" />
												</Button>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => deleteMutation.mutate(category.id)}
													disabled={
														category._count.driverLicenses > 0 ||
														category._count.vehiclesRequiringThis > 0 ||
														deleteMutation.isPending
													}
												>
													<TrashIcon className="size-4 text-destructive" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				)}
			</CardContent>

			{/* Create/Edit Dialog */}
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent>
					<form onSubmit={handleSubmit}>
						<DialogHeader>
							<DialogTitle>
								{editingCategory
									? t("fleet.settings.licenseCategories.edit")
									: t("fleet.settings.licenseCategories.add")}
							</DialogTitle>
							<DialogDescription>
								{t("fleet.settings.licenseCategories.dialogDescription")}
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4 py-4">
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="code">{t("fleet.settings.licenseCategories.form.code")} *</Label>
									<Input
										id="code"
										value={formData.code}
										onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
										placeholder="B, D, D_CMI"
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="name">{t("fleet.settings.licenseCategories.form.name")} *</Label>
									<Input
										id="name"
										value={formData.name}
										onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
										required
									/>
								</div>
							</div>
							<div className="space-y-2">
								<Label htmlFor="description">{t("fleet.settings.licenseCategories.form.description")}</Label>
								<Textarea
									id="description"
									value={formData.description || ""}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, description: e.target.value || null }))
									}
									rows={3}
								/>
							</div>
						</div>
						<DialogFooter>
							<Button type="button" variant="outline" onClick={handleCloseDialog}>
								{t("common.confirmation.cancel")}
							</Button>
							<Button type="submit" disabled={isPending || !formData.code || !formData.name}>
								{isPending && <Loader2Icon className="size-4 mr-2 animate-spin" />}
								{editingCategory ? t("common.confirmation.save") : t("common.confirmation.create")}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</Card>
	);
}

// License Rules Section (RSE Rules)
function LicenseRulesSection() {
	const t = useTranslations();
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const { isSessionSynced } = useActiveOrganization();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingRule, setEditingRule] = useState<OrganizationLicenseRuleWithCategory | null>(null);
	const [formData, setFormData] = useState<LicenseRuleFormData>({
		licenseCategoryId: "",
		maxDailyDrivingHours: 10,
		maxDailyAmplitudeHours: 14,
		breakMinutesPerDrivingBlock: 45,
		drivingBlockHoursForBreak: 4.5,
		cappedAverageSpeedKmh: null,
	});

	const { data: rulesData, isLoading: rulesLoading } = useQuery({
		queryKey: ["license-rules"],
		queryFn: async () => {
			const response = await apiClient.vtc["license-rules"].$get({
				query: { limit: "100" },
			});
			if (!response.ok) throw new Error("Failed to fetch license rules");
			return response.json() as Promise<LicenseRulesResponse>;
		},
		enabled: isSessionSynced,
	});

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
		mutationFn: async (data: LicenseRuleFormData) => {
			const response = await apiClient.vtc["license-rules"].$post({
				json: data,
			});
			if (!response.ok) throw new Error("Failed to create license rule");
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["license-rules"] });
			toast({ title: t("fleet.settings.notifications.ruleCreated") });
			handleCloseDialog();
		},
		onError: () => {
			toast({ title: t("fleet.settings.notifications.ruleCreateFailed"), variant: "error" });
		},
	});

	const updateMutation = useMutation({
		mutationFn: async ({ id, data }: { id: string; data: Partial<LicenseRuleFormData> }) => {
			const response = await apiClient.vtc["license-rules"][":id"].$patch({
				param: { id },
				json: data,
			});
			if (!response.ok) throw new Error("Failed to update license rule");
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["license-rules"] });
			toast({ title: t("fleet.settings.notifications.ruleUpdated") });
			handleCloseDialog();
		},
		onError: () => {
			toast({ title: t("fleet.settings.notifications.ruleUpdateFailed"), variant: "error" });
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			const response = await apiClient.vtc["license-rules"][":id"].$delete({
				param: { id },
			});
			if (!response.ok) throw new Error("Failed to delete license rule");
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["license-rules"] });
			toast({ title: t("fleet.settings.notifications.ruleDeleted") });
		},
		onError: () => {
			toast({ title: t("fleet.settings.notifications.ruleDeleteFailed"), variant: "error" });
		},
	});

	// Get categories that don't have rules yet
	const availableCategories = categoriesData?.data.filter(
		(cat) => !rulesData?.data.some((rule) => rule.licenseCategoryId === cat.id)
	);

	const handleOpenCreate = () => {
		setEditingRule(null);
		setFormData({
			licenseCategoryId: availableCategories?.[0]?.id || "",
			maxDailyDrivingHours: 10,
			maxDailyAmplitudeHours: 14,
			breakMinutesPerDrivingBlock: 45,
			drivingBlockHoursForBreak: 4.5,
			cappedAverageSpeedKmh: null,
		});
		setDialogOpen(true);
	};

	const handleOpenEdit = (rule: OrganizationLicenseRuleWithCategory) => {
		setEditingRule(rule);
		setFormData({
			licenseCategoryId: rule.licenseCategoryId,
			maxDailyDrivingHours: Number.parseFloat(rule.maxDailyDrivingHours),
			maxDailyAmplitudeHours: Number.parseFloat(rule.maxDailyAmplitudeHours),
			breakMinutesPerDrivingBlock: rule.breakMinutesPerDrivingBlock,
			drivingBlockHoursForBreak: Number.parseFloat(rule.drivingBlockHoursForBreak),
			cappedAverageSpeedKmh: rule.cappedAverageSpeedKmh,
		});
		setDialogOpen(true);
	};

	const handleCloseDialog = () => {
		setDialogOpen(false);
		setEditingRule(null);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (editingRule) {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { licenseCategoryId: _, ...updateData } = formData;
			updateMutation.mutate({ id: editingRule.id, data: updateData });
		} else {
			createMutation.mutate(formData);
		}
	};

	const isPending = createMutation.isPending || updateMutation.isPending;

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<div>
					<CardTitle>{t("fleet.settings.rseRules.title")}</CardTitle>
					<CardDescription>
						{t("fleet.settings.rseRules.description")}
					</CardDescription>
				</div>
				<Button onClick={handleOpenCreate} disabled={!availableCategories?.length}>
					<PlusIcon className="size-4 mr-2" />
					{t("fleet.settings.rseRules.add")}
				</Button>
			</CardHeader>
			<CardContent>
				{rulesLoading ? (
					<div className="flex items-center justify-center py-8">
						<Loader2Icon className="size-6 animate-spin text-muted-foreground" />
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{t("fleet.settings.rseRules.columns.licenseCategory")}</TableHead>
								<TableHead className="text-center">{t("fleet.settings.rseRules.columns.maxDriving")}</TableHead>
								<TableHead className="text-center">{t("fleet.settings.rseRules.columns.maxAmplitude")}</TableHead>
								<TableHead className="text-center">{t("fleet.settings.rseRules.columns.breakRules")}</TableHead>
								<TableHead className="text-center">{t("fleet.settings.rseRules.columns.speedCap")}</TableHead>
								<TableHead className="w-[100px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rulesData?.data.length === 0 ? (
								<TableRow>
									<TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
										{t("fleet.settings.rseRules.empty")}
									</TableCell>
								</TableRow>
							) : (
								rulesData?.data.map((rule) => (
									<TableRow key={rule.id}>
										<TableCell>
											<Badge variant="outline" className="flex items-center gap-1 w-fit">
												<ShieldCheckIcon className="size-3" />
												{rule.licenseCategory.code}
											</Badge>
										</TableCell>
										<TableCell className="text-center font-mono">
											{rule.maxDailyDrivingHours}h
										</TableCell>
										<TableCell className="text-center font-mono">
											{rule.maxDailyAmplitudeHours}h
										</TableCell>
										<TableCell className="text-center text-sm">
											{rule.breakMinutesPerDrivingBlock}min / {rule.drivingBlockHoursForBreak}h
										</TableCell>
										<TableCell className="text-center font-mono">
											{rule.cappedAverageSpeedKmh ? `${rule.cappedAverageSpeedKmh} km/h` : "-"}
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-1">
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleOpenEdit(rule)}
												>
													<PencilIcon className="size-4" />
												</Button>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => deleteMutation.mutate(rule.id)}
													disabled={deleteMutation.isPending}
												>
													<TrashIcon className="size-4 text-destructive" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				)}
			</CardContent>

			{/* Create/Edit Dialog */}
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="max-w-lg">
					<form onSubmit={handleSubmit}>
						<DialogHeader>
							<DialogTitle>
								{editingRule
									? t("fleet.settings.rseRules.edit")
									: t("fleet.settings.rseRules.add")}
							</DialogTitle>
							<DialogDescription>
								{t("fleet.settings.rseRules.dialogDescription")}
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4 py-4">
							{!editingRule && (
								<div className="space-y-2">
									<Label>{t("fleet.settings.rseRules.form.licenseCategory")} *</Label>
									<select
										className="w-full h-10 px-3 rounded-md border border-input bg-background"
										value={formData.licenseCategoryId}
										onChange={(e) =>
											setFormData((prev) => ({ ...prev, licenseCategoryId: e.target.value }))
										}
										required
									>
										<option value="">{t("fleet.settings.rseRules.form.selectCategory")}</option>
										{availableCategories?.map((cat) => (
											<option key={cat.id} value={cat.id}>
												{cat.code} - {cat.name}
											</option>
										))}
									</select>
								</div>
							)}

							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label>{t("fleet.settings.rseRules.form.maxDailyDriving")} *</Label>
									<Input
										type="number"
										step="0.5"
										min={0}
										max={24}
										value={formData.maxDailyDrivingHours}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												maxDailyDrivingHours: Number.parseFloat(e.target.value) || 0,
											}))
										}
										required
									/>
								</div>
								<div className="space-y-2">
									<Label>{t("fleet.settings.rseRules.form.maxDailyAmplitude")} *</Label>
									<Input
										type="number"
										step="0.5"
										min={0}
										max={24}
										value={formData.maxDailyAmplitudeHours}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												maxDailyAmplitudeHours: Number.parseFloat(e.target.value) || 0,
											}))
										}
										required
									/>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label>{t("fleet.settings.rseRules.form.breakMinutes")} *</Label>
									<Input
										type="number"
										min={0}
										max={120}
										value={formData.breakMinutesPerDrivingBlock}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												breakMinutesPerDrivingBlock: Number.parseInt(e.target.value) || 0,
											}))
										}
										required
									/>
								</div>
								<div className="space-y-2">
									<Label>{t("fleet.settings.rseRules.form.drivingBlockHours")} *</Label>
									<Input
										type="number"
										step="0.5"
										min={0}
										max={12}
										value={formData.drivingBlockHoursForBreak}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												drivingBlockHoursForBreak: Number.parseFloat(e.target.value) || 0,
											}))
										}
										required
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label>{t("fleet.settings.rseRules.form.cappedSpeed")}</Label>
								<Input
									type="number"
									min={0}
									max={150}
									value={formData.cappedAverageSpeedKmh ?? ""}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											cappedAverageSpeedKmh: e.target.value ? Number.parseInt(e.target.value) : null,
										}))
									}
									placeholder={t("fleet.settings.rseRules.form.cappedSpeedPlaceholder")}
								/>
							</div>
						</div>
						<DialogFooter>
							<Button type="button" variant="outline" onClick={handleCloseDialog}>
								{t("common.confirmation.cancel")}
							</Button>
							<Button
								type="submit"
								disabled={isPending || (!editingRule && !formData.licenseCategoryId)}
							>
								{isPending && <Loader2Icon className="size-4 mr-2 animate-spin" />}
								{editingRule ? t("common.confirmation.save") : t("common.confirmation.create")}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</Card>
	);
}

// Configuration Health Summary
function ConfigHealthSummary() {
	const t = useTranslations();
	const { isSessionSynced } = useActiveOrganization();

	const { data, isLoading } = useQuery({
		queryKey: ["config-health"],
		queryFn: async () => {
			const response = await apiClient.vtc["pricing-settings"].health.$get();
			if (!response.ok) throw new Error("Failed to fetch config health");
			return response.json() as Promise<ConfigHealthResponse>;
		},
		enabled: isSessionSynced,
	});

	if (isLoading || !data) {
		return null;
	}

	const { status, errors, warnings } = data;

	if (status === "ok") {
		return (
			<Alert className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
				<CheckCircleIcon className="size-4 text-green-600" />
				<AlertTitle className="text-green-800 dark:text-green-200">
					{t("fleet.settings.configHealth.title")}
				</AlertTitle>
				<AlertDescription className="text-green-700 dark:text-green-300">
					{t("fleet.settings.configHealth.ok")}
				</AlertDescription>
			</Alert>
		);
	}

	const allIssues = [
		...errors.map((e) => ({ type: "error" as const, key: e })),
		...warnings.map((w) => ({ type: "warning" as const, key: w })),
	];

	return (
		<Alert
			className={`mb-6 ${
				status === "error"
					? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
					: "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950"
			}`}
		>
			{status === "error" ? (
				<XCircleIcon className="size-4 text-red-600" />
			) : (
				<AlertTriangleIcon className="size-4 text-yellow-600" />
			)}
			<AlertTitle
				className={
					status === "error"
						? "text-red-800 dark:text-red-200"
						: "text-yellow-800 dark:text-yellow-200"
				}
			>
				{t("fleet.settings.configHealth.title")}
			</AlertTitle>
			<AlertDescription>
				<ul className="mt-2 space-y-1">
					{allIssues.map((issue) => (
						<li
							key={issue.key}
							className={
								issue.type === "error"
									? "text-red-700 dark:text-red-300"
									: "text-yellow-700 dark:text-yellow-300"
							}
						>
							• {t(`fleet.settings.configHealth.warnings.${issue.key}`)}
						</li>
					))}
				</ul>
			</AlertDescription>
		</Alert>
	);
}

// Vehicle Categories Section
function VehicleCategoriesSection() {
	const t = useTranslations();
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const { isSessionSynced } = useActiveOrganization();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingCategory, setEditingCategory] = useState<VehicleCategoryWithCount | null>(null);
	const [formData, setFormData] = useState<VehicleCategoryFormData>({
		code: "",
		name: "",
		regulatoryCategory: "LIGHT",
		maxPassengers: 4,
		maxLuggageVolume: null,
		priceMultiplier: 1.0,
		defaultRatePerKm: null,
		defaultRatePerHour: null,
		description: null,
		isActive: true,
	});

	const { data, isLoading } = useQuery({
		queryKey: ["vehicle-categories"],
		queryFn: async () => {
			const response = await apiClient.vtc["vehicle-categories"].$get({
				query: { limit: "100" },
			});
			if (!response.ok) throw new Error("Failed to fetch vehicle categories");
			return response.json() as Promise<VehicleCategoriesResponse>;
		},
		enabled: isSessionSynced,
	});

	const createMutation = useMutation({
		mutationFn: async (data: VehicleCategoryFormData) => {
			const response = await apiClient.vtc["vehicle-categories"].$post({
				json: data,
			});
			if (!response.ok) throw new Error("Failed to create vehicle category");
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["vehicle-categories"] });
			queryClient.invalidateQueries({ queryKey: ["config-health"] });
			toast({ title: t("fleet.settings.notifications.vehicleCategoryCreated") });
			handleCloseDialog();
		},
		onError: () => {
			toast({ title: t("fleet.settings.notifications.vehicleCategoryCreateFailed"), variant: "error" });
		},
	});

	const updateMutation = useMutation({
		mutationFn: async ({ id, data }: { id: string; data: Partial<VehicleCategoryFormData> }) => {
			const response = await apiClient.vtc["vehicle-categories"][":id"].$patch({
				param: { id },
				json: data,
			});
			if (!response.ok) throw new Error("Failed to update vehicle category");
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["vehicle-categories"] });
			toast({ title: t("fleet.settings.notifications.vehicleCategoryUpdated") });
			handleCloseDialog();
		},
		onError: () => {
			toast({ title: t("fleet.settings.notifications.vehicleCategoryUpdateFailed"), variant: "error" });
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			const response = await apiClient.vtc["vehicle-categories"][":id"].$delete({
				param: { id },
			});
			if (!response.ok) throw new Error("Failed to delete vehicle category");
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["vehicle-categories"] });
			queryClient.invalidateQueries({ queryKey: ["config-health"] });
			toast({ title: t("fleet.settings.notifications.vehicleCategoryDeleted") });
		},
		onError: () => {
			toast({ title: t("fleet.settings.notifications.vehicleCategoryDeleteFailed"), variant: "error" });
		},
	});

	const handleOpenCreate = () => {
		setEditingCategory(null);
		setFormData({
			code: "",
			name: "",
			regulatoryCategory: "LIGHT",
			maxPassengers: 4,
			maxLuggageVolume: null,
			priceMultiplier: 1.0,
			defaultRatePerKm: null,
			defaultRatePerHour: null,
			description: null,
			isActive: true,
		});
		setDialogOpen(true);
	};

	const handleOpenEdit = (category: VehicleCategoryWithCount) => {
		setEditingCategory(category);
		setFormData({
			code: category.code,
			name: category.name,
			regulatoryCategory: category.regulatoryCategory,
			maxPassengers: category.maxPassengers,
			maxLuggageVolume: category.maxLuggageVolume,
			priceMultiplier: Number(category.priceMultiplier),
			defaultRatePerKm: category.defaultRatePerKm ? Number(category.defaultRatePerKm) : null,
			defaultRatePerHour: category.defaultRatePerHour ? Number(category.defaultRatePerHour) : null,
			description: category.description,
			isActive: category.isActive,
		});
		setDialogOpen(true);
	};

	const handleCloseDialog = () => {
		setDialogOpen(false);
		setEditingCategory(null);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (editingCategory) {
			updateMutation.mutate({ id: editingCategory.id, data: formData });
		} else {
			createMutation.mutate(formData);
		}
	};

	const isPending = createMutation.isPending || updateMutation.isPending;

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<div>
					<CardTitle>{t("fleet.settings.vehicleCategories.title")}</CardTitle>
					<CardDescription>
						{t("fleet.settings.vehicleCategories.description")}
					</CardDescription>
				</div>
				<Button onClick={handleOpenCreate}>
					<PlusIcon className="size-4 mr-2" />
					{t("fleet.settings.vehicleCategories.add")}
				</Button>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="flex items-center justify-center py-8">
						<Loader2Icon className="size-6 animate-spin text-muted-foreground" />
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{t("fleet.settings.vehicleCategories.columns.code")}</TableHead>
								<TableHead>{t("fleet.settings.vehicleCategories.columns.name")}</TableHead>
								<TableHead>{t("fleet.settings.vehicleCategories.columns.regulatory")}</TableHead>
								<TableHead className="text-center">{t("fleet.settings.vehicleCategories.columns.maxPassengers")}</TableHead>
								<TableHead className="text-center">{t("fleet.settings.vehicleCategories.columns.priceMultiplier")}</TableHead>
								<TableHead className="text-center">{t("fleet.settings.vehicleCategories.columns.vehicles")}</TableHead>
								<TableHead>{t("fleet.settings.vehicleCategories.columns.status")}</TableHead>
								<TableHead className="w-[100px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data?.data.length === 0 ? (
								<TableRow>
									<TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
										{t("fleet.settings.vehicleCategories.empty")}
									</TableCell>
								</TableRow>
							) : (
								data?.data.map((category) => (
									<TableRow key={category.id}>
										<TableCell>
											<Badge variant="outline" className="flex items-center gap-1 w-fit">
												<CarIcon className="size-3" />
												{category.code}
											</Badge>
										</TableCell>
										<TableCell className="font-medium">{category.name}</TableCell>
										<TableCell>
											<Badge variant={category.regulatoryCategory === "HEAVY" ? "destructive" : "secondary"}>
												{t(`fleet.settings.vehicleCategories.regulatory.${category.regulatoryCategory}`)}
											</Badge>
										</TableCell>
										<TableCell className="text-center">{category.maxPassengers}</TableCell>
										<TableCell className="text-center font-mono">×{Number(category.priceMultiplier).toFixed(2)}</TableCell>
										<TableCell className="text-center">{category._count.vehicles}</TableCell>
										<TableCell>
											<Badge variant={category.isActive ? "default" : "secondary"}>
												{category.isActive ? "Active" : "Inactive"}
											</Badge>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-1">
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleOpenEdit(category)}
												>
													<PencilIcon className="size-4" />
												</Button>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => deleteMutation.mutate(category.id)}
													disabled={category._count.vehicles > 0 || deleteMutation.isPending}
												>
													<TrashIcon className="size-4 text-destructive" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				)}
			</CardContent>

			{/* Create/Edit Dialog */}
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="max-w-lg">
					<form onSubmit={handleSubmit}>
						<DialogHeader>
							<DialogTitle>
								{editingCategory
									? t("fleet.settings.vehicleCategories.edit")
									: t("fleet.settings.vehicleCategories.add")}
							</DialogTitle>
							<DialogDescription>
								{t("fleet.settings.vehicleCategories.dialogDescription")}
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4 py-4">
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="code">{t("fleet.settings.vehicleCategories.form.code")} *</Label>
									<Input
										id="code"
										value={formData.code}
										onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
										placeholder={t("fleet.settings.vehicleCategories.form.codePlaceholder")}
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="name">{t("fleet.settings.vehicleCategories.form.name")} *</Label>
									<Input
										id="name"
										value={formData.name}
										onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
										required
									/>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label>{t("fleet.settings.vehicleCategories.form.regulatoryCategory")} *</Label>
									<Select
										value={formData.regulatoryCategory}
										onValueChange={(value: VehicleRegulatoryCategory) =>
											setFormData((prev) => ({ ...prev, regulatoryCategory: value }))
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="LIGHT">{t("fleet.settings.vehicleCategories.regulatory.LIGHT")}</SelectItem>
											<SelectItem value="HEAVY">{t("fleet.settings.vehicleCategories.regulatory.HEAVY")}</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label htmlFor="maxPassengers">{t("fleet.settings.vehicleCategories.form.maxPassengers")} *</Label>
									<Input
										id="maxPassengers"
										type="number"
										min={1}
										max={100}
										value={formData.maxPassengers}
										onChange={(e) =>
											setFormData((prev) => ({ ...prev, maxPassengers: Number.parseInt(e.target.value) || 1 }))
										}
										required
									/>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="maxLuggageVolume">{t("fleet.settings.vehicleCategories.form.maxLuggageVolume")}</Label>
									<Input
										id="maxLuggageVolume"
										type="number"
										min={0}
										value={formData.maxLuggageVolume ?? ""}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												maxLuggageVolume: e.target.value ? Number.parseInt(e.target.value) : null,
											}))
										}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="priceMultiplier">{t("fleet.settings.vehicleCategories.form.priceMultiplier")} *</Label>
									<Input
										id="priceMultiplier"
										type="number"
										step="0.01"
										min={0.1}
										max={10}
										value={formData.priceMultiplier}
										onChange={(e) =>
											setFormData((prev) => ({ ...prev, priceMultiplier: Number.parseFloat(e.target.value) || 1 }))
										}
										required
									/>
									<p className="text-xs text-muted-foreground">
										{t("fleet.settings.vehicleCategories.form.priceMultiplierHelp")}
									</p>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="defaultRatePerKm">{t("fleet.settings.vehicleCategories.form.defaultRatePerKm")}</Label>
									<Input
										id="defaultRatePerKm"
										type="number"
										step="0.01"
										min={0}
										value={formData.defaultRatePerKm ?? ""}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												defaultRatePerKm: e.target.value ? Number.parseFloat(e.target.value) : null,
											}))
										}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="defaultRatePerHour">{t("fleet.settings.vehicleCategories.form.defaultRatePerHour")}</Label>
									<Input
										id="defaultRatePerHour"
										type="number"
										step="0.01"
										min={0}
										value={formData.defaultRatePerHour ?? ""}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												defaultRatePerHour: e.target.value ? Number.parseFloat(e.target.value) : null,
											}))
										}
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="description">{t("fleet.settings.vehicleCategories.form.description")}</Label>
								<Textarea
									id="description"
									value={formData.description || ""}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, description: e.target.value || null }))
									}
									rows={2}
								/>
							</div>

							<div className="flex items-center gap-2">
								<Switch
									id="isActive"
									checked={formData.isActive}
									onCheckedChange={(checked) =>
										setFormData((prev) => ({ ...prev, isActive: checked }))
									}
								/>
								<Label htmlFor="isActive">{t("fleet.settings.vehicleCategories.form.isActive")}</Label>
							</div>
						</div>
						<DialogFooter>
							<Button type="button" variant="outline" onClick={handleCloseDialog}>
								{t("common.confirmation.cancel")}
							</Button>
							<Button type="submit" disabled={isPending || !formData.code || !formData.name}>
								{isPending && <Loader2Icon className="size-4 mr-2 animate-spin" />}
								{editingCategory ? t("common.confirmation.save") : t("common.confirmation.create")}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</Card>
	);
}

// Cost Parameters Section
function CostParametersSection() {
	const t = useTranslations();
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const { isSessionSynced } = useActiveOrganization();

	const { data, isLoading } = useQuery({
		queryKey: ["pricing-settings"],
		queryFn: async () => {
			const response = await apiClient.vtc["pricing-settings"].$get();
			if (!response.ok) throw new Error("Failed to fetch pricing settings");
			return response.json() as Promise<OrganizationPricingSettings | null>;
		},
		enabled: isSessionSynced,
	});

	// Initialize form data from query data or defaults
	const defaultFormData: PricingSettingsFormData = {
		baseRatePerKm: data?.baseRatePerKm ?? 1.2,
		baseRatePerHour: data?.baseRatePerHour ?? 35.0,
		defaultMarginPercent: data?.defaultMarginPercent ?? 20.0,
		greenMarginThreshold: data?.greenMarginThreshold ?? 20.0,
		orangeMarginThreshold: data?.orangeMarginThreshold ?? 0.0,
		minimumFare: data?.minimumFare ?? 25.0,
		roundingRule: data?.roundingRule ?? null,
		fuelConsumptionL100km: data?.fuelConsumptionL100km ?? null,
		fuelPricePerLiter: data?.fuelPricePerLiter ?? null,
		tollCostPerKm: data?.tollCostPerKm ?? null,
		wearCostPerKm: data?.wearCostPerKm ?? null,
		driverHourlyCost: data?.driverHourlyCost ?? null,
		// Story 17.1: Zone conflict resolution strategy
		zoneConflictStrategy: data?.zoneConflictStrategy ?? null,
	};

	const [formData, setFormData] = useState<PricingSettingsFormData>(defaultFormData);

	// Reset form when data changes (using key prop pattern would be cleaner but this works)
	const dataKey = data?.id ?? "new";
	const [lastDataKey, setLastDataKey] = useState(dataKey);
	if (dataKey !== lastDataKey) {
		setLastDataKey(dataKey);
		setFormData(defaultFormData);
	}

	const updateMutation = useMutation({
		mutationFn: async (data: Partial<PricingSettingsFormData>) => {
			const response = await apiClient.vtc["pricing-settings"].$patch({
				json: data,
			});
			if (!response.ok) throw new Error("Failed to update pricing settings");
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["pricing-settings"] });
			queryClient.invalidateQueries({ queryKey: ["config-health"] });
			toast({ title: t("fleet.settings.costParameters.saveSuccess") });
		},
		onError: () => {
			toast({ title: t("fleet.settings.costParameters.saveError"), variant: "error" });
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		updateMutation.mutate(formData);
	};

	if (isLoading) {
		return (
			<Card>
				<CardContent className="flex items-center justify-center py-8">
					<Loader2Icon className="size-6 animate-spin text-muted-foreground" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("fleet.settings.costParameters.title")}</CardTitle>
				<CardDescription>
					{t("fleet.settings.costParameters.description")}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-8">
					{/* Base Rates Section */}
					<div className="space-y-4">
						<h3 className="text-lg font-medium flex items-center gap-2">
							<SettingsIcon className="size-5" />
							{t("fleet.settings.costParameters.sections.baseRates")}
						</h3>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="baseRatePerKm">{t("fleet.settings.costParameters.fields.baseRatePerKm")}</Label>
								<Input
									id="baseRatePerKm"
									type="number"
									step="0.01"
									min={0}
									value={formData.baseRatePerKm}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, baseRatePerKm: Number.parseFloat(e.target.value) || 0 }))
									}
									required
								/>
								<p className="text-xs text-muted-foreground">
									{t("fleet.settings.costParameters.fields.baseRatePerKmHelp")}
								</p>
							</div>
							<div className="space-y-2">
								<Label htmlFor="baseRatePerHour">{t("fleet.settings.costParameters.fields.baseRatePerHour")}</Label>
								<Input
									id="baseRatePerHour"
									type="number"
									step="0.01"
									min={0}
									value={formData.baseRatePerHour}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, baseRatePerHour: Number.parseFloat(e.target.value) || 0 }))
									}
									required
								/>
								<p className="text-xs text-muted-foreground">
									{t("fleet.settings.costParameters.fields.baseRatePerHourHelp")}
								</p>
							</div>
						</div>
					</div>

					{/* Margin Settings Section */}
					<div className="space-y-4">
						<h3 className="text-lg font-medium">{t("fleet.settings.costParameters.sections.margins")}</h3>
						<div className="grid grid-cols-3 gap-4">
							<div className="space-y-2">
								<Label htmlFor="defaultMarginPercent">{t("fleet.settings.costParameters.fields.defaultMarginPercent")}</Label>
								<Input
									id="defaultMarginPercent"
									type="number"
									step="0.1"
									min={0}
									max={100}
									value={formData.defaultMarginPercent}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, defaultMarginPercent: Number.parseFloat(e.target.value) || 0 }))
									}
									required
								/>
								<p className="text-xs text-muted-foreground">
									{t("fleet.settings.costParameters.fields.defaultMarginPercentHelp")}
								</p>
							</div>
							<div className="space-y-2">
								<Label htmlFor="greenMarginThreshold">{t("fleet.settings.costParameters.fields.greenMarginThreshold")}</Label>
								<Input
									id="greenMarginThreshold"
									type="number"
									step="0.1"
									min={0}
									max={100}
									value={formData.greenMarginThreshold}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, greenMarginThreshold: Number.parseFloat(e.target.value) || 0 }))
									}
									required
								/>
								<p className="text-xs text-muted-foreground">
									{t("fleet.settings.costParameters.fields.greenMarginThresholdHelp")}
								</p>
							</div>
							<div className="space-y-2">
								<Label htmlFor="orangeMarginThreshold">{t("fleet.settings.costParameters.fields.orangeMarginThreshold")}</Label>
								<Input
									id="orangeMarginThreshold"
									type="number"
									step="0.1"
									min={-100}
									max={100}
									value={formData.orangeMarginThreshold}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, orangeMarginThreshold: Number.parseFloat(e.target.value) || 0 }))
									}
									required
								/>
								<p className="text-xs text-muted-foreground">
									{t("fleet.settings.costParameters.fields.orangeMarginThresholdHelp")}
								</p>
							</div>
						</div>
					</div>

					{/* Minimum Fare Section */}
					<div className="space-y-4">
						<h3 className="text-lg font-medium">{t("fleet.settings.costParameters.sections.minimumFare")}</h3>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="minimumFare">{t("fleet.settings.costParameters.fields.minimumFare")}</Label>
								<Input
									id="minimumFare"
									type="number"
									step="0.01"
									min={0}
									value={formData.minimumFare}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, minimumFare: Number.parseFloat(e.target.value) || 0 }))
									}
									required
								/>
								<p className="text-xs text-muted-foreground">
									{t("fleet.settings.costParameters.fields.minimumFareHelp")}
								</p>
							</div>
							<div className="space-y-2">
								<Label htmlFor="roundingRule">{t("fleet.settings.costParameters.fields.roundingRule")}</Label>
								<Select
									value={formData.roundingRule || "none"}
									onValueChange={(value) =>
										setFormData((prev) => ({ ...prev, roundingRule: value === "none" ? null : value }))
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">{t("fleet.settings.costParameters.roundingRules.none")}</SelectItem>
										<SelectItem value="NEAREST_5">{t("fleet.settings.costParameters.roundingRules.NEAREST_5")}</SelectItem>
										<SelectItem value="NEAREST_10">{t("fleet.settings.costParameters.roundingRules.NEAREST_10")}</SelectItem>
										<SelectItem value="CEIL_5">{t("fleet.settings.costParameters.roundingRules.CEIL_5")}</SelectItem>
										<SelectItem value="CEIL_10">{t("fleet.settings.costParameters.roundingRules.CEIL_10")}</SelectItem>
									</SelectContent>
								</Select>
								<p className="text-xs text-muted-foreground">
									{t("fleet.settings.costParameters.fields.roundingRuleHelp")}
								</p>
							</div>
						</div>
					</div>

					{/* Operational Costs Section */}
					<div className="space-y-4">
						<h3 className="text-lg font-medium">{t("fleet.settings.costParameters.sections.operationalCosts")}</h3>
						<div className="grid grid-cols-3 gap-4">
							<div className="space-y-2">
								<Label htmlFor="fuelConsumptionL100km">{t("fleet.settings.costParameters.fields.fuelConsumptionL100km")}</Label>
								<Input
									id="fuelConsumptionL100km"
									type="number"
									step="0.1"
									min={0}
									value={formData.fuelConsumptionL100km ?? ""}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											fuelConsumptionL100km: e.target.value ? Number.parseFloat(e.target.value) : null,
										}))
									}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="fuelPricePerLiter">{t("fleet.settings.costParameters.fields.fuelPricePerLiter")}</Label>
								<Input
									id="fuelPricePerLiter"
									type="number"
									step="0.01"
									min={0}
									value={formData.fuelPricePerLiter ?? ""}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											fuelPricePerLiter: e.target.value ? Number.parseFloat(e.target.value) : null,
										}))
									}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="driverHourlyCost">{t("fleet.settings.costParameters.fields.driverHourlyCost")}</Label>
								<Input
									id="driverHourlyCost"
									type="number"
									step="0.01"
									min={0}
									value={formData.driverHourlyCost ?? ""}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											driverHourlyCost: e.target.value ? Number.parseFloat(e.target.value) : null,
										}))
									}
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="tollCostPerKm">{t("fleet.settings.costParameters.fields.tollCostPerKm")}</Label>
								<Input
									id="tollCostPerKm"
									type="number"
									step="0.01"
									min={0}
									value={formData.tollCostPerKm ?? ""}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											tollCostPerKm: e.target.value ? Number.parseFloat(e.target.value) : null,
										}))
									}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="wearCostPerKm">{t("fleet.settings.costParameters.fields.wearCostPerKm")}</Label>
								<Input
									id="wearCostPerKm"
									type="number"
									step="0.01"
									min={0}
									value={formData.wearCostPerKm ?? ""}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											wearCostPerKm: e.target.value ? Number.parseFloat(e.target.value) : null,
										}))
									}
								/>
							</div>
						</div>
					</div>

					{/* Story 17.1: Zone Conflict Resolution Strategy Section */}
					<div className="space-y-4">
						<h3 className="text-lg font-medium">{t("fleet.settings.costParameters.sections.zoneConflict")}</h3>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="zoneConflictStrategy">{t("fleet.settings.costParameters.fields.zoneConflictStrategy")}</Label>
								<Select
									value={formData.zoneConflictStrategy || "default"}
									onValueChange={(value) =>
										setFormData((prev) => ({ ...prev, zoneConflictStrategy: value === "default" ? null : value as "PRIORITY" | "MOST_EXPENSIVE" | "CLOSEST" | "COMBINED" }))
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="default">{t("fleet.settings.costParameters.zoneConflictStrategies.default")}</SelectItem>
										<SelectItem value="PRIORITY">{t("fleet.settings.costParameters.zoneConflictStrategies.PRIORITY")}</SelectItem>
										<SelectItem value="MOST_EXPENSIVE">{t("fleet.settings.costParameters.zoneConflictStrategies.MOST_EXPENSIVE")}</SelectItem>
										<SelectItem value="CLOSEST">{t("fleet.settings.costParameters.zoneConflictStrategies.CLOSEST")}</SelectItem>
										<SelectItem value="COMBINED">{t("fleet.settings.costParameters.zoneConflictStrategies.COMBINED")}</SelectItem>
									</SelectContent>
								</Select>
								<p className="text-xs text-muted-foreground">
									{t("fleet.settings.costParameters.fields.zoneConflictStrategyHelp")}
								</p>
							</div>
						</div>
					</div>

					<div className="flex justify-end">
						<Button type="submit" disabled={updateMutation.isPending}>
							{updateMutation.isPending && <Loader2Icon className="size-4 mr-2 animate-spin" />}
							{t("fleet.settings.costParameters.save")}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
