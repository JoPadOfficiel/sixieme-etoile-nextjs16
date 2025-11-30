"use client";

/**
 * Extras & Promotions Page (Unified)
 * Story 11.5: Merge Optional Fees & Promotions Pages
 *
 * Combines Optional Fees and Promotions into a single tabbed interface
 * for easier management of quote add-ons and discounts.
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
	Gift,
	Package,
	Percent,
	PlusIcon,
	Tag,
	TrendingUp,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";

// Optional Fees imports
import {
	OptionalFeeFormDialog,
	OptionalFeeList,
} from "@saas/settings/pricing/components";
import {
	useOptionalFees,
	useOptionalFeeStats,
	useCreateOptionalFee,
	useUpdateOptionalFee,
	useDeleteOptionalFee,
} from "@saas/settings/pricing/hooks";
import type {
	OptionalFee,
	OptionalFeeTypeFilter,
	OptionalFeeStatusFilter,
	CreateOptionalFeeRequest,
	UpdateOptionalFeeRequest,
} from "@saas/settings/pricing/types/optional-fee";

// Promotions imports
import {
	PromotionFormDialog,
	PromotionList,
} from "@saas/settings/pricing/components";
import {
	usePromotions,
	usePromotionStats,
	useCreatePromotion,
	useUpdatePromotion,
	useDeletePromotion,
} from "@saas/settings/pricing/hooks";
import type {
	Promotion,
	PromotionTypeFilter,
	PromotionStatusFilter,
	CreatePromotionRequest,
	UpdatePromotionRequest,
} from "@saas/settings/pricing/types/promotion";

type TabValue = "fees" | "promotions";

export default function SettingsPricingExtrasPage() {
	const t = useTranslations("settings.pricing.extras");
	const tFees = useTranslations("settings.pricing.optionalFees");
	const tPromos = useTranslations("settings.pricing.promotions");
	const tCommon = useTranslations("common");
	const { toast } = useToast();
	const router = useRouter();
	const searchParams = useSearchParams();

	// Get initial tab from URL or default to "fees"
	const initialTab = (searchParams.get("tab") as TabValue) || "fees";
	const [activeTab, setActiveTab] = useState<TabValue>(initialTab);

	// Update URL when tab changes
	const handleTabChange = (value: string) => {
		const tab = value as TabValue;
		setActiveTab(tab);
		router.replace(`?tab=${tab}`, { scroll: false });
	};

	// =========================================================================
	// Optional Fees State
	// =========================================================================
	const [feeTypeFilter, setFeeTypeFilter] = useState<OptionalFeeTypeFilter>("all");
	const [feeStatusFilter, setFeeStatusFilter] =
		useState<OptionalFeeStatusFilter>("all");
	const [feeDialogOpen, setFeeDialogOpen] = useState(false);
	const [editingFee, setEditingFee] = useState<OptionalFee | null>(null);
	const [deleteFeeDialogOpen, setDeleteFeeDialogOpen] = useState(false);
	const [deletingFee, setDeletingFee] = useState<OptionalFee | null>(null);

	// Optional Fees Queries
	const { data: feeStatsData } = useOptionalFeeStats();
	const { data: feesData, isLoading: feesLoading } = useOptionalFees({
		type: feeTypeFilter,
		status: feeStatusFilter,
	});

	// Optional Fees Mutations
	const createFeeMutation = useCreateOptionalFee();
	const updateFeeMutation = useUpdateOptionalFee();
	const deleteFeeMutation = useDeleteOptionalFee();

	// =========================================================================
	// Promotions State
	// =========================================================================
	const [promoTypeFilter, setPromoTypeFilter] =
		useState<PromotionTypeFilter>("all");
	const [promoStatusFilter, setPromoStatusFilter] =
		useState<PromotionStatusFilter>("all");
	const [promoDialogOpen, setPromoDialogOpen] = useState(false);
	const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
	const [deletePromoDialogOpen, setDeletePromoDialogOpen] = useState(false);
	const [deletingPromotion, setDeletingPromotion] = useState<Promotion | null>(null);

	// Promotions Queries
	const { data: promoStatsData } = usePromotionStats();
	const { data: promotionsData, isLoading: promotionsLoading } = usePromotions({
		type: promoTypeFilter,
		status: promoStatusFilter,
	});

	// Promotions Mutations
	const createPromoMutation = useCreatePromotion();
	const updatePromoMutation = useUpdatePromotion();
	const deletePromoMutation = useDeletePromotion();

	// =========================================================================
	// Optional Fees Handlers
	// =========================================================================
	const handleAddFee = () => {
		setEditingFee(null);
		setFeeDialogOpen(true);
	};

	const handleEditFee = (fee: OptionalFee) => {
		setEditingFee(fee);
		setFeeDialogOpen(true);
	};

	const handleDeleteFee = (fee: OptionalFee) => {
		setDeletingFee(fee);
		setDeleteFeeDialogOpen(true);
	};

	const handleFeeSubmit = async (
		data: CreateOptionalFeeRequest | UpdateOptionalFeeRequest
	) => {
		try {
			if (editingFee) {
				await updateFeeMutation.mutateAsync({
					id: editingFee.id,
					data: data as UpdateOptionalFeeRequest,
				});
				toast({
					title: tCommon("success"),
					description: tFees("toast.updateSuccess"),
				});
			} else {
				await createFeeMutation.mutateAsync(data as CreateOptionalFeeRequest);
				toast({
					title: tCommon("success"),
					description: tFees("toast.createSuccess"),
				});
			}
			setFeeDialogOpen(false);
			setEditingFee(null);
		} catch (error) {
			toast({
				title: tCommon("error"),
				description:
					error instanceof Error ? error.message : tFees("toast.error"),
				variant: "error",
			});
		}
	};

	const confirmDeleteFee = async () => {
		if (!deletingFee) return;

		try {
			await deleteFeeMutation.mutateAsync(deletingFee.id);
			toast({
				title: tCommon("success"),
				description: tFees("toast.deleteSuccess"),
			});
			setDeleteFeeDialogOpen(false);
			setDeletingFee(null);
		} catch (error) {
			toast({
				title: tCommon("error"),
				description:
					error instanceof Error ? error.message : tFees("toast.error"),
				variant: "error",
			});
		}
	};

	// =========================================================================
	// Promotions Handlers
	// =========================================================================
	const handleAddPromotion = () => {
		setEditingPromotion(null);
		setPromoDialogOpen(true);
	};

	const handleEditPromotion = (promotion: Promotion) => {
		setEditingPromotion(promotion);
		setPromoDialogOpen(true);
	};

	const handleDeletePromotion = (promotion: Promotion) => {
		setDeletingPromotion(promotion);
		setDeletePromoDialogOpen(true);
	};

	const handlePromoSubmit = async (
		data: CreatePromotionRequest | UpdatePromotionRequest
	) => {
		try {
			if (editingPromotion) {
				await updatePromoMutation.mutateAsync({
					id: editingPromotion.id,
					data: data as UpdatePromotionRequest,
				});
				toast({
					title: tCommon("success"),
					description: tPromos("toast.updateSuccess"),
				});
			} else {
				await createPromoMutation.mutateAsync(data as CreatePromotionRequest);
				toast({
					title: tCommon("success"),
					description: tPromos("toast.createSuccess"),
				});
			}
			setPromoDialogOpen(false);
			setEditingPromotion(null);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : tPromos("toast.error");
			const isCodeExists = errorMessage.toLowerCase().includes("already exists");
			toast({
				title: tCommon("error"),
				description: isCodeExists ? tPromos("toast.codeExists") : errorMessage,
				variant: "error",
			});
		}
	};

	const confirmDeletePromotion = async () => {
		if (!deletingPromotion) return;

		try {
			await deletePromoMutation.mutateAsync(deletingPromotion.id);
			toast({
				title: tCommon("success"),
				description: tPromos("toast.deleteSuccess"),
			});
			setDeletePromoDialogOpen(false);
			setDeletingPromotion(null);
		} catch (error) {
			toast({
				title: tCommon("error"),
				description:
					error instanceof Error ? error.message : tPromos("toast.error"),
				variant: "error",
			});
		}
	};

	// =========================================================================
	// Combined Stats for Summary Cards
	// =========================================================================
	const totalFeesActive = feeStatsData?.active ?? 0;
	const totalPromosActive = promoStatsData?.active ?? 0;
	const totalActive = totalFeesActive + totalPromosActive;
	const totalPromoUses = promoStatsData?.totalUses ?? 0;

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
							{t("stats.activeFees")}
						</CardTitle>
						<Package className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{totalFeesActive}</div>
						<p className="text-xs text-muted-foreground">
							{t("stats.activeFeesDesc")}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							{t("stats.activePromos")}
						</CardTitle>
						<Tag className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{totalPromosActive}</div>
						<p className="text-xs text-muted-foreground">
							{t("stats.activePromosDesc")}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							{t("stats.promoUses")}
						</CardTitle>
						<Gift className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{totalPromoUses}</div>
						<p className="text-xs text-muted-foreground">
							{t("stats.promoUsesDesc")}
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Tabbed Interface */}
			<Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
				<TabsList>
					<TabsTrigger value="fees" data-testid="fees-tab">
						<Package className="mr-2 h-4 w-4" />
						{t("tabs.fees")}
					</TabsTrigger>
					<TabsTrigger value="promotions" data-testid="promotions-tab">
						<Percent className="mr-2 h-4 w-4" />
						{t("tabs.promotions")}
					</TabsTrigger>
				</TabsList>

				{/* Optional Fees Tab */}
				<TabsContent value="fees" className="space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-lg font-medium">{tFees("title")}</h2>
							<p className="text-sm text-muted-foreground">
								{tFees("description")}
							</p>
						</div>
						<Button onClick={handleAddFee} data-testid="add-fee-button">
							<PlusIcon className="mr-2 size-4" />
							{tFees("addButton")}
						</Button>
					</div>

					<OptionalFeeList
						fees={feesData?.data ?? []}
						isLoading={feesLoading}
						typeFilter={feeTypeFilter}
						statusFilter={feeStatusFilter}
						onTypeFilterChange={setFeeTypeFilter}
						onStatusFilterChange={setFeeStatusFilter}
						onEdit={handleEditFee}
						onDelete={handleDeleteFee}
					/>
				</TabsContent>

				{/* Promotions Tab */}
				<TabsContent value="promotions" className="space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-lg font-medium">{tPromos("title")}</h2>
							<p className="text-sm text-muted-foreground">
								{tPromos("description")}
							</p>
						</div>
						<Button onClick={handleAddPromotion} data-testid="add-promotion-button">
							<PlusIcon className="mr-2 size-4" />
							{tPromos("addButton")}
						</Button>
					</div>

					<PromotionList
						promotions={promotionsData?.data ?? []}
						isLoading={promotionsLoading}
						typeFilter={promoTypeFilter}
						statusFilter={promoStatusFilter}
						onTypeFilterChange={setPromoTypeFilter}
						onStatusFilterChange={setPromoStatusFilter}
						onEdit={handleEditPromotion}
						onDelete={handleDeletePromotion}
					/>
				</TabsContent>
			</Tabs>

			{/* Optional Fee Dialogs */}
			<OptionalFeeFormDialog
				open={feeDialogOpen}
				onOpenChange={setFeeDialogOpen}
				fee={editingFee}
				onSubmit={handleFeeSubmit}
				isSubmitting={createFeeMutation.isPending || updateFeeMutation.isPending}
			/>

			<AlertDialog open={deleteFeeDialogOpen} onOpenChange={setDeleteFeeDialogOpen}>
				<AlertDialogContent data-testid="delete-fee-dialog">
					<AlertDialogHeader>
						<AlertDialogTitle>{tFees("delete.title")}</AlertDialogTitle>
						<AlertDialogDescription>
							{tFees("delete.message", { name: deletingFee?.name ?? "" })}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleteFeeMutation.isPending}>
							{tFees("delete.cancel")}
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDeleteFee}
							disabled={deleteFeeMutation.isPending}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							data-testid="confirm-delete-fee"
						>
							{deleteFeeMutation.isPending
								? tCommon("deleting")
								: tFees("delete.confirm")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Promotion Dialogs */}
			<PromotionFormDialog
				open={promoDialogOpen}
				onOpenChange={setPromoDialogOpen}
				promotion={editingPromotion}
				onSubmit={handlePromoSubmit}
				isSubmitting={createPromoMutation.isPending || updatePromoMutation.isPending}
			/>

			<AlertDialog open={deletePromoDialogOpen} onOpenChange={setDeletePromoDialogOpen}>
				<AlertDialogContent data-testid="delete-promo-dialog">
					<AlertDialogHeader>
						<AlertDialogTitle>{tPromos("delete.title")}</AlertDialogTitle>
						<AlertDialogDescription>
							{tPromos("delete.message", { code: deletingPromotion?.code ?? "" })}
							{deletingPromotion && deletingPromotion.currentUses > 0 && (
								<span className="block mt-2 text-amber-600 dark:text-amber-400">
									{tPromos("delete.usageWarning", { count: deletingPromotion.currentUses })}
								</span>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deletePromoMutation.isPending}>
							{tPromos("delete.cancel")}
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDeletePromotion}
							disabled={deletePromoMutation.isPending}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							data-testid="confirm-delete-promo"
						>
							{deletePromoMutation.isPending
								? tCommon("deleting")
								: tPromos("delete.confirm")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
