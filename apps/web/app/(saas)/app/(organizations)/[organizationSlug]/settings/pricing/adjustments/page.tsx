"use client";

/**
 * Pricing Adjustments Page (Unified)
 * Story 11.4: Merge Seasonal Multipliers & Advanced Rates Pages
 *
 * Combines Seasonal Multipliers and Advanced Rates (NIGHT/WEEKEND only)
 * into a single tabbed interface for easier management.
 */

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@ui/components/alert-dialog";
import { Button } from "@ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/components/tabs";
import { useToast } from "@ui/hooks/use-toast";
import {
	CalendarDays,
	Clock,
	Moon,
	PlusIcon,
	TrendingUp,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Seasonal Multipliers imports
import {
	SeasonalMultiplierFormDialog,
	SeasonalMultiplierList,
} from "@saas/settings/pricing/components";
import {
	useSeasonalMultipliers,
	useSeasonalMultiplierStats,
	useCreateSeasonalMultiplier,
	useUpdateSeasonalMultiplier,
	useDeleteSeasonalMultiplier,
} from "@saas/settings/pricing/hooks";
import type {
	SeasonalMultiplier,
	SeasonalMultiplierStatusFilter,
	CreateSeasonalMultiplierRequest,
	UpdateSeasonalMultiplierRequest,
} from "@saas/settings/pricing/types/seasonal-multiplier";

// Advanced Rates imports
import {
	AdvancedRateFormDialog,
	AdvancedRateList,
} from "@saas/settings/pricing/components";
import {
	useAdvancedRates,
	useAdvancedRateStats,
	useCreateAdvancedRate,
	useUpdateAdvancedRate,
	useDeleteAdvancedRate,
} from "@saas/settings/pricing/hooks";
import type {
	AdvancedRate,
	AdvancedRateTypeFilter,
	AdvancedRateStatusFilter,
	CreateAdvancedRateRequest,
	UpdateAdvancedRateRequest,
} from "@saas/settings/pricing/types/advanced-rate";

interface PricingZone {
	id: string;
	name: string;
}

type TabValue = "seasonal" | "time-based";

export default function SettingsPricingAdjustmentsPage() {
	const t = useTranslations("settings.pricing.adjustments");
	const tSeasonal = useTranslations("settings.pricing.seasonalMultipliers");
	const tAdvanced = useTranslations("settings.pricing.advancedRates");
	const tCommon = useTranslations("common");
	const { toast } = useToast();
	const router = useRouter();
	const searchParams = useSearchParams();

	// Get initial tab from URL or default to "seasonal"
	const initialTab = (searchParams.get("tab") as TabValue) || "seasonal";
	const [activeTab, setActiveTab] = useState<TabValue>(initialTab);

	// Update URL when tab changes
	const handleTabChange = (value: string) => {
		const tab = value as TabValue;
		setActiveTab(tab);
		router.replace(`?tab=${tab}`, { scroll: false });
	};

	// =========================================================================
	// Seasonal Multipliers State
	// =========================================================================
	const [seasonalStatusFilter, setSeasonalStatusFilter] =
		useState<SeasonalMultiplierStatusFilter>("all");
	const [seasonalDialogOpen, setSeasonalDialogOpen] = useState(false);
	const [editingMultiplier, setEditingMultiplier] =
		useState<SeasonalMultiplier | null>(null);
	const [deleteSeasonalDialogOpen, setDeleteSeasonalDialogOpen] = useState(false);
	const [deletingMultiplier, setDeletingMultiplier] =
		useState<SeasonalMultiplier | null>(null);

	// Seasonal Queries
	const { data: seasonalStatsData, isLoading: seasonalStatsLoading } =
		useSeasonalMultiplierStats();
	const { data: multipliersData, isLoading: multipliersLoading } =
		useSeasonalMultipliers({ status: seasonalStatusFilter });

	// Seasonal Mutations
	const createSeasonalMutation = useCreateSeasonalMultiplier();
	const updateSeasonalMutation = useUpdateSeasonalMultiplier();
	const deleteSeasonalMutation = useDeleteSeasonalMultiplier();

	// =========================================================================
	// Advanced Rates State
	// =========================================================================
	const [rateTypeFilter, setRateTypeFilter] =
		useState<AdvancedRateTypeFilter>("all");
	const [rateStatusFilter, setRateStatusFilter] =
		useState<AdvancedRateStatusFilter>("all");
	const [rateDialogOpen, setRateDialogOpen] = useState(false);
	const [editingRate, setEditingRate] = useState<AdvancedRate | null>(null);
	const [deleteRateDialogOpen, setDeleteRateDialogOpen] = useState(false);
	const [deletingRate, setDeletingRate] = useState<AdvancedRate | null>(null);
	const [zones, setZones] = useState<PricingZone[]>([]);

	// Fetch zones for the form (kept for backward compatibility)
	useEffect(() => {
		const fetchZones = async () => {
			try {
				const response = await fetch("/api/vtc/pricing/zones?limit=100");
				if (!response.ok) throw new Error("Failed to fetch zones");
				const data = await response.json();
				setZones(data.data || []);
			} catch (error) {
				console.error("Error fetching zones:", error);
			}
		};
		fetchZones();
	}, []);

	// Advanced Rates Queries
	const { data: rateStatsData, isLoading: rateStatsLoading } =
		useAdvancedRateStats();
	const { data: ratesData, isLoading: ratesLoading } = useAdvancedRates({
		type: rateTypeFilter,
		status: rateStatusFilter,
	});

	// Advanced Rates Mutations
	const createRateMutation = useCreateAdvancedRate();
	const updateRateMutation = useUpdateAdvancedRate();
	const deleteRateMutation = useDeleteAdvancedRate();

	// =========================================================================
	// Seasonal Multipliers Handlers
	// =========================================================================
	const handleAddMultiplier = () => {
		setEditingMultiplier(null);
		setSeasonalDialogOpen(true);
	};

	const handleEditMultiplier = (multiplier: SeasonalMultiplier) => {
		setEditingMultiplier(multiplier);
		setSeasonalDialogOpen(true);
	};

	const handleDeleteMultiplier = (multiplier: SeasonalMultiplier) => {
		setDeletingMultiplier(multiplier);
		setDeleteSeasonalDialogOpen(true);
	};

	const handleSeasonalSubmit = async (
		data: CreateSeasonalMultiplierRequest | UpdateSeasonalMultiplierRequest
	) => {
		try {
			if (editingMultiplier) {
				await updateSeasonalMutation.mutateAsync({
					id: editingMultiplier.id,
					data: data as UpdateSeasonalMultiplierRequest,
				});
				toast({
					title: tCommon("success"),
					description: tSeasonal("toast.updateSuccess"),
				});
			} else {
				await createSeasonalMutation.mutateAsync(
					data as CreateSeasonalMultiplierRequest
				);
				toast({
					title: tCommon("success"),
					description: tSeasonal("toast.createSuccess"),
				});
			}
			setSeasonalDialogOpen(false);
			setEditingMultiplier(null);
		} catch (error) {
			toast({
				title: tCommon("error"),
				description:
					error instanceof Error ? error.message : tSeasonal("toast.error"),
				variant: "error",
			});
		}
	};

	const confirmDeleteMultiplier = async () => {
		if (!deletingMultiplier) return;

		try {
			await deleteSeasonalMutation.mutateAsync(deletingMultiplier.id);
			toast({
				title: tCommon("success"),
				description: tSeasonal("toast.deleteSuccess"),
			});
			setDeleteSeasonalDialogOpen(false);
			setDeletingMultiplier(null);
		} catch (error) {
			toast({
				title: tCommon("error"),
				description:
					error instanceof Error ? error.message : tSeasonal("toast.error"),
				variant: "error",
			});
		}
	};

	// =========================================================================
	// Advanced Rates Handlers
	// =========================================================================
	const handleAddRate = () => {
		setEditingRate(null);
		setRateDialogOpen(true);
	};

	const handleEditRate = (rate: AdvancedRate) => {
		setEditingRate(rate);
		setRateDialogOpen(true);
	};

	const handleDeleteRate = (rate: AdvancedRate) => {
		setDeletingRate(rate);
		setDeleteRateDialogOpen(true);
	};

	const handleRateSubmit = async (
		data: CreateAdvancedRateRequest | UpdateAdvancedRateRequest
	) => {
		try {
			if (editingRate) {
				await updateRateMutation.mutateAsync({
					id: editingRate.id,
					data: data as UpdateAdvancedRateRequest,
				});
				toast({
					title: tCommon("success"),
					description: tAdvanced("toast.updateSuccess"),
				});
			} else {
				await createRateMutation.mutateAsync(data as CreateAdvancedRateRequest);
				toast({
					title: tCommon("success"),
					description: tAdvanced("toast.createSuccess"),
				});
			}
			setRateDialogOpen(false);
			setEditingRate(null);
		} catch (error) {
			toast({
				title: tCommon("error"),
				description:
					error instanceof Error ? error.message : tAdvanced("toast.error"),
				variant: "error",
			});
		}
	};

	const confirmDeleteRate = async () => {
		if (!deletingRate) return;

		try {
			await deleteRateMutation.mutateAsync(deletingRate.id);
			toast({
				title: tCommon("success"),
				description: tAdvanced("toast.deleteSuccess"),
			});
			setDeleteRateDialogOpen(false);
			setDeletingRate(null);
		} catch (error) {
			toast({
				title: tCommon("error"),
				description:
					error instanceof Error ? error.message : tAdvanced("toast.error"),
				variant: "error",
			});
		}
	};

	// =========================================================================
	// Combined Stats for Summary Cards
	// =========================================================================
	const totalSeasonalActive = seasonalStatsData?.currentlyActive ?? 0;
	const totalRatesActive = rateStatsData?.totalActive ?? 0;
	const totalActive = totalSeasonalActive + totalRatesActive;

	const totalSeasonalUpcoming = seasonalStatsData?.upcoming ?? 0;
	const nightRates = rateStatsData?.night ?? 0;
	const weekendRates = rateStatsData?.weekend ?? 0;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
				<p className="text-sm text-muted-foreground">{t("description")}</p>
			</div>

			{/* Unified Summary Cards */}
			<div className="grid gap-4 md:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							{t("stats.totalActive")}
						</CardTitle>
						<TrendingUp className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{totalActive}</div>
						<p className="text-xs text-muted-foreground">
							{t("stats.totalActiveDesc")}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							{t("stats.seasonal")}
						</CardTitle>
						<CalendarDays className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{totalSeasonalActive}</div>
						<p className="text-xs text-muted-foreground">
							{totalSeasonalUpcoming} {t("stats.upcoming")}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							{t("stats.nightRates")}
						</CardTitle>
						<Moon className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{nightRates}</div>
						<p className="text-xs text-muted-foreground">
							{t("stats.nightRatesDesc")}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							{t("stats.weekendRates")}
						</CardTitle>
						<Clock className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{weekendRates}</div>
						<p className="text-xs text-muted-foreground">
							{t("stats.weekendRatesDesc")}
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Tabbed Interface */}
			<Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
				<TabsList>
					<TabsTrigger value="seasonal" data-testid="seasonal-tab">
						<CalendarDays className="mr-2 h-4 w-4" />
						{t("tabs.seasonal")}
					</TabsTrigger>
					<TabsTrigger value="time-based" data-testid="time-based-tab">
						<Clock className="mr-2 h-4 w-4" />
						{t("tabs.timeBased")}
					</TabsTrigger>
				</TabsList>

				{/* Seasonal Multipliers Tab */}
				<TabsContent value="seasonal" className="space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-lg font-medium">{tSeasonal("title")}</h2>
							<p className="text-sm text-muted-foreground">
								{tSeasonal("description")}
							</p>
						</div>
						<Button
							onClick={handleAddMultiplier}
							data-testid="add-multiplier-button"
						>
							<PlusIcon className="mr-2 size-4" />
							{tSeasonal("addButton")}
						</Button>
					</div>

					<SeasonalMultiplierList
						multipliers={multipliersData?.data ?? []}
						isLoading={multipliersLoading}
						statusFilter={seasonalStatusFilter}
						onStatusFilterChange={setSeasonalStatusFilter}
						onEdit={handleEditMultiplier}
						onDelete={handleDeleteMultiplier}
					/>
				</TabsContent>

				{/* Time-Based Rates Tab (NIGHT/WEEKEND only) */}
				<TabsContent value="time-based" className="space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-lg font-medium">{tAdvanced("title")}</h2>
							<p className="text-sm text-muted-foreground">
								{t("tabs.timeBasedDesc")}
							</p>
						</div>
						<Button onClick={handleAddRate} data-testid="add-rate-button">
							<PlusIcon className="mr-2 size-4" />
							{tAdvanced("addButton")}
						</Button>
					</div>

					<AdvancedRateList
						rates={ratesData?.data ?? []}
						isLoading={ratesLoading}
						typeFilter={rateTypeFilter}
						statusFilter={rateStatusFilter}
						onTypeFilterChange={setRateTypeFilter}
						onStatusFilterChange={setRateStatusFilter}
						onEdit={handleEditRate}
						onDelete={handleDeleteRate}
					/>
				</TabsContent>
			</Tabs>

			{/* Seasonal Multiplier Dialogs */}
			<SeasonalMultiplierFormDialog
				open={seasonalDialogOpen}
				onOpenChange={setSeasonalDialogOpen}
				multiplier={editingMultiplier}
				onSubmit={handleSeasonalSubmit}
				isSubmitting={
					createSeasonalMutation.isPending || updateSeasonalMutation.isPending
				}
			/>

			<AlertDialog
				open={deleteSeasonalDialogOpen}
				onOpenChange={setDeleteSeasonalDialogOpen}
			>
				<AlertDialogContent data-testid="delete-seasonal-dialog">
					<AlertDialogHeader>
						<AlertDialogTitle>{tSeasonal("delete.title")}</AlertDialogTitle>
						<AlertDialogDescription>
							{tSeasonal("delete.message", {
								name: deletingMultiplier?.name ?? "",
							})}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleteSeasonalMutation.isPending}>
							{tSeasonal("delete.cancel")}
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDeleteMultiplier}
							disabled={deleteSeasonalMutation.isPending}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							data-testid="confirm-delete-seasonal"
						>
							{deleteSeasonalMutation.isPending
								? tCommon("deleting")
								: tSeasonal("delete.confirm")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Advanced Rate Dialogs */}
			<AdvancedRateFormDialog
				open={rateDialogOpen}
				onOpenChange={setRateDialogOpen}
				rate={editingRate}
				zones={zones}
				onSubmit={handleRateSubmit}
				isSubmitting={
					createRateMutation.isPending || updateRateMutation.isPending
				}
			/>

			<AlertDialog
				open={deleteRateDialogOpen}
				onOpenChange={setDeleteRateDialogOpen}
			>
				<AlertDialogContent data-testid="delete-rate-dialog">
					<AlertDialogHeader>
						<AlertDialogTitle>{tAdvanced("delete.title")}</AlertDialogTitle>
						<AlertDialogDescription>
							{tAdvanced("delete.message", { name: deletingRate?.name ?? "" })}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleteRateMutation.isPending}>
							{tAdvanced("delete.cancel")}
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDeleteRate}
							disabled={deleteRateMutation.isPending}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							data-testid="confirm-delete-rate"
						>
							{deleteRateMutation.isPending
								? tCommon("deleting")
								: tAdvanced("delete.confirm")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
