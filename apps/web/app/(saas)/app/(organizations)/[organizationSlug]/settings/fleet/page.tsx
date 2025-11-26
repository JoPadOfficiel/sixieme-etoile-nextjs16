"use client";

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
	Loader2Icon,
	PencilIcon,
	PlusIcon,
	ShieldCheckIcon,
	TrashIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type {
	LicenseCategoriesResponse,
	LicenseCategoryFormData,
	LicenseCategoryWithCount,
	LicenseRulesResponse,
	LicenseRuleFormData,
	OrganizationLicenseRuleWithCategory,
} from "@saas/fleet/types";

export default function SettingsFleetPage() {
	const t = useTranslations();

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

			<Tabs defaultValue="license-categories" className="space-y-6">
				<TabsList>
					<TabsTrigger value="license-categories">
						{t("fleet.settings.tabs.licenseCategories")}
					</TabsTrigger>
					<TabsTrigger value="rse-rules">
						{t("fleet.settings.tabs.rseRules")}
					</TabsTrigger>
				</TabsList>

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
			const { licenseCategoryId: _licenseCategoryId, ...updateData } = formData;
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
