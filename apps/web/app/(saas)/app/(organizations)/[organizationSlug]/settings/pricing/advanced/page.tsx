"use client";

/**
 * Advanced Pricing Settings Page
 * Story 17.16: FR Group 9 Settings UI Integration
 *
 * Unified interface for all Epic 17 advanced pricing and operational configurations:
 * - Zone Resolution (17.1, 17.2)
 * - Compliance & Staffing (17.3, 17.4)
 * - Time-Based Pricing (17.9, 17.12)
 * - Client Scoring (17.15)
 */

import { Button } from "@ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@ui/components/card";
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
import { useToast } from "@ui/hooks/use-toast";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { apiClient } from "@shared/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertTriangleIcon,
	ClockIcon,
	ExternalLinkIcon,
	HelpCircleIcon,
	Loader2Icon,
	MapPinIcon,
	SaveIcon,
	ShieldCheckIcon,
	UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@ui/components/tooltip";

// Types for the settings
interface AdvancedPricingSettings {
	zoneConflictStrategy: string | null;
	zoneMultiplierAggregationStrategy: string | null;
	staffingSelectionPolicy: string | null;
	hotelCostPerNight: number | null;
	mealCostPerDay: number | null;
	driverOvernightPremium: number | null;
	secondDriverHourlyRate: number | null;
	relayDriverFixedFee: number | null;
	useDriverHomeForDeadhead: boolean;
	timeBucketInterpolationStrategy: string | null;
	difficultyMultipliers: Record<string, number> | null;
}

// Default difficulty multipliers
const DEFAULT_DIFFICULTY_MULTIPLIERS: Record<string, number> = {
	"1": 1.0,
	"2": 1.02,
	"3": 1.05,
	"4": 1.08,
	"5": 1.1,
};

export default function AdvancedPricingSettingsPage() {
	const t = useTranslations("settings.pricing.advanced");
	const tCommon = useTranslations("common");
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const { isSessionSynced } = useActiveOrganization();
	const params = useParams();
	const organizationSlug = params.organizationSlug as string;

	// Form state
	const [formData, setFormData] = useState<AdvancedPricingSettings>({
		zoneConflictStrategy: null,
		zoneMultiplierAggregationStrategy: null,
		staffingSelectionPolicy: null,
		hotelCostPerNight: null,
		mealCostPerDay: null,
		driverOvernightPremium: null,
		secondDriverHourlyRate: null,
		relayDriverFixedFee: null,
		useDriverHomeForDeadhead: false,
		timeBucketInterpolationStrategy: null,
		difficultyMultipliers: null,
	});

	const [hasChanges, setHasChanges] = useState(false);

	// Fetch current settings
	const { data: settingsData, isLoading } = useQuery({
		queryKey: ["pricing-settings"],
		queryFn: async () => {
			const response = await apiClient.vtc["pricing-settings"].$get();
			if (!response.ok) throw new Error("Failed to fetch pricing settings");
			return response.json();
		},
		enabled: isSessionSynced,
	});

	// Update form when data loads
	useEffect(() => {
		if (settingsData) {
			setFormData({
				zoneConflictStrategy: settingsData.zoneConflictStrategy ?? null,
				zoneMultiplierAggregationStrategy:
					settingsData.zoneMultiplierAggregationStrategy ?? null,
				staffingSelectionPolicy: settingsData.staffingSelectionPolicy ?? null,
				hotelCostPerNight: settingsData.hotelCostPerNight ?? null,
				mealCostPerDay: settingsData.mealCostPerDay ?? null,
				driverOvernightPremium: settingsData.driverOvernightPremium ?? null,
				secondDriverHourlyRate: settingsData.secondDriverHourlyRate ?? null,
				relayDriverFixedFee: settingsData.relayDriverFixedFee ?? null,
				useDriverHomeForDeadhead: settingsData.useDriverHomeForDeadhead ?? false,
				timeBucketInterpolationStrategy:
					settingsData.timeBucketInterpolationStrategy ?? null,
				difficultyMultipliers:
					(settingsData.difficultyMultipliers as Record<string, number>) ?? null,
			});
			setHasChanges(false);
		}
	}, [settingsData]);

	// Save mutation
	const saveMutation = useMutation({
		mutationFn: async (data: Partial<AdvancedPricingSettings>) => {
			const response = await apiClient.vtc["pricing-settings"].$patch({
				json: data,
			});
			if (!response.ok) throw new Error("Failed to save settings");
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["pricing-settings"] });
			toast({
				title: tCommon("success"),
				description: t("toast.saveSuccess"),
			});
			setHasChanges(false);
		},
		onError: (error) => {
			toast({
				title: tCommon("error"),
				description: error instanceof Error ? error.message : t("toast.saveError"),
				variant: "error",
			});
		},
	});

	const handleSave = () => {
		saveMutation.mutate(formData);
	};

	const updateField = <K extends keyof AdvancedPricingSettings>(
		field: K,
		value: AdvancedPricingSettings[K]
	) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		setHasChanges(true);
	};

	const updateDifficultyMultiplier = (score: string, value: number) => {
		const current = formData.difficultyMultipliers ?? DEFAULT_DIFFICULTY_MULTIPLIERS;
		setFormData((prev) => ({
			...prev,
			difficultyMultipliers: { ...current, [score]: value },
		}));
		setHasChanges(true);
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-16">
				<Loader2Icon className="size-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const basePath = `/app/${organizationSlug}/settings`;

	return (
		<TooltipProvider>
			<div className="space-y-6">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
						<p className="text-sm text-muted-foreground">{t("description")}</p>
					</div>
					<Button
						onClick={handleSave}
						disabled={!hasChanges || saveMutation.isPending}
					>
						{saveMutation.isPending ? (
							<Loader2Icon className="mr-2 size-4 animate-spin" />
						) : (
							<SaveIcon className="mr-2 size-4" />
						)}
						{tCommon("confirmation.save")}
					</Button>
				</div>

				{/* Zone Resolution Section */}
				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							<MapPinIcon className="size-5 text-muted-foreground" />
							<CardTitle>{t("sections.zoneResolution.title")}</CardTitle>
						</div>
						<CardDescription>
							{t("sections.zoneResolution.description")}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Zone Conflict Strategy */}
						<div className="grid gap-2">
							<div className="flex items-center gap-2">
								<Label htmlFor="zoneConflictStrategy">
									{t("fields.zoneConflictStrategy.label")}
								</Label>
								<Tooltip>
									<TooltipTrigger asChild>
										<HelpCircleIcon className="size-4 text-muted-foreground cursor-help" />
									</TooltipTrigger>
									<TooltipContent className="max-w-xs">
										{t("fields.zoneConflictStrategy.help")}
									</TooltipContent>
								</Tooltip>
							</div>
							<Select
								value={formData.zoneConflictStrategy ?? "default"}
								onValueChange={(value) =>
									updateField(
										"zoneConflictStrategy",
										value === "default" ? null : value
									)
								}
							>
								<SelectTrigger id="zoneConflictStrategy">
									<SelectValue
										placeholder={t("fields.zoneConflictStrategy.placeholder")}
									/>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="default">
										{t("fields.zoneConflictStrategy.options.default")}
									</SelectItem>
									<SelectItem value="PRIORITY">
										{t("fields.zoneConflictStrategy.options.PRIORITY")}
									</SelectItem>
									<SelectItem value="MOST_EXPENSIVE">
										{t("fields.zoneConflictStrategy.options.MOST_EXPENSIVE")}
									</SelectItem>
									<SelectItem value="CLOSEST">
										{t("fields.zoneConflictStrategy.options.CLOSEST")}
									</SelectItem>
									<SelectItem value="COMBINED">
										{t("fields.zoneConflictStrategy.options.COMBINED")}
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Zone Multiplier Aggregation */}
						<div className="grid gap-2">
							<div className="flex items-center gap-2">
								<Label htmlFor="zoneMultiplierAggregation">
									{t("fields.zoneMultiplierAggregation.label")}
								</Label>
								<Tooltip>
									<TooltipTrigger asChild>
										<HelpCircleIcon className="size-4 text-muted-foreground cursor-help" />
									</TooltipTrigger>
									<TooltipContent className="max-w-xs">
										{t("fields.zoneMultiplierAggregation.help")}
									</TooltipContent>
								</Tooltip>
							</div>
							<Select
								value={formData.zoneMultiplierAggregationStrategy ?? "default"}
								onValueChange={(value) =>
									updateField(
										"zoneMultiplierAggregationStrategy",
										value === "default" ? null : value
									)
								}
							>
								<SelectTrigger id="zoneMultiplierAggregation">
									<SelectValue
										placeholder={t("fields.zoneMultiplierAggregation.placeholder")}
									/>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="default">
										{t("fields.zoneMultiplierAggregation.options.default")}
									</SelectItem>
									<SelectItem value="MAX">
										{t("fields.zoneMultiplierAggregation.options.MAX")}
									</SelectItem>
									<SelectItem value="PICKUP_ONLY">
										{t("fields.zoneMultiplierAggregation.options.PICKUP_ONLY")}
									</SelectItem>
									<SelectItem value="DROPOFF_ONLY">
										{t("fields.zoneMultiplierAggregation.options.DROPOFF_ONLY")}
									</SelectItem>
									<SelectItem value="AVERAGE">
										{t("fields.zoneMultiplierAggregation.options.AVERAGE")}
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="border-t" />

						{/* Link to Zone Management */}
						<div className="flex items-center justify-between rounded-lg border p-4">
							<div className="space-y-0.5">
								<p className="text-sm font-medium">
									{t("links.zoneManagement.title")}
								</p>
								<p className="text-sm text-muted-foreground">
									{t("links.zoneManagement.description")}
								</p>
							</div>
							<Link href={`${basePath}/pricing/zones`}>
								<Button variant="outline" size="sm">
									{t("links.zoneManagement.button")}
									<ExternalLinkIcon className="ml-2 size-4" />
								</Button>
							</Link>
						</div>
					</CardContent>
				</Card>

				{/* Compliance & Staffing Section */}
				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							<ShieldCheckIcon className="size-5 text-muted-foreground" />
							<CardTitle>{t("sections.complianceStaffing.title")}</CardTitle>
						</div>
						<CardDescription>
							{t("sections.complianceStaffing.description")}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Staffing Selection Policy */}
						<div className="grid gap-2">
							<div className="flex items-center gap-2">
								<Label htmlFor="staffingSelectionPolicy">
									{t("fields.staffingSelectionPolicy.label")}
								</Label>
								<Tooltip>
									<TooltipTrigger asChild>
										<HelpCircleIcon className="size-4 text-muted-foreground cursor-help" />
									</TooltipTrigger>
									<TooltipContent className="max-w-xs">
										{t("fields.staffingSelectionPolicy.help")}
									</TooltipContent>
								</Tooltip>
							</div>
							<Select
								value={formData.staffingSelectionPolicy ?? "default"}
								onValueChange={(value) =>
									updateField(
										"staffingSelectionPolicy",
										value === "default" ? null : value
									)
								}
							>
								<SelectTrigger id="staffingSelectionPolicy">
									<SelectValue
										placeholder={t("fields.staffingSelectionPolicy.placeholder")}
									/>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="default">
										{t("fields.staffingSelectionPolicy.options.default")}
									</SelectItem>
									<SelectItem value="CHEAPEST">
										{t("fields.staffingSelectionPolicy.options.CHEAPEST")}
									</SelectItem>
									<SelectItem value="FASTEST">
										{t("fields.staffingSelectionPolicy.options.FASTEST")}
									</SelectItem>
									<SelectItem value="PREFER_INTERNAL">
										{t("fields.staffingSelectionPolicy.options.PREFER_INTERNAL")}
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="border-t" />

						{/* Staffing Cost Parameters */}
						<div className="space-y-4">
							<h4 className="text-sm font-medium">
								{t("sections.complianceStaffing.costParameters")}
							</h4>
							<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
								<div className="space-y-2">
									<Label htmlFor="hotelCostPerNight">
										{t("fields.hotelCostPerNight.label")}
									</Label>
									<div className="relative">
										<Input
											id="hotelCostPerNight"
											type="number"
											min={0}
											step={1}
											value={formData.hotelCostPerNight ?? ""}
											onChange={(e) =>
												updateField(
													"hotelCostPerNight",
													e.target.value ? Number(e.target.value) : null
												)
											}
											placeholder="100"
											className="pr-8"
										/>
										<span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
											€
										</span>
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="mealCostPerDay">
										{t("fields.mealCostPerDay.label")}
									</Label>
									<div className="relative">
										<Input
											id="mealCostPerDay"
											type="number"
											min={0}
											step={1}
											value={formData.mealCostPerDay ?? ""}
											onChange={(e) =>
												updateField(
													"mealCostPerDay",
													e.target.value ? Number(e.target.value) : null
												)
											}
											placeholder="30"
											className="pr-8"
										/>
										<span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
											€
										</span>
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="driverOvernightPremium">
										{t("fields.driverOvernightPremium.label")}
									</Label>
									<div className="relative">
										<Input
											id="driverOvernightPremium"
											type="number"
											min={0}
											step={1}
											value={formData.driverOvernightPremium ?? ""}
											onChange={(e) =>
												updateField(
													"driverOvernightPremium",
													e.target.value ? Number(e.target.value) : null
												)
											}
											placeholder="50"
											className="pr-8"
										/>
										<span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
											€
										</span>
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="secondDriverHourlyRate">
										{t("fields.secondDriverHourlyRate.label")}
									</Label>
									<div className="relative">
										<Input
											id="secondDriverHourlyRate"
											type="number"
											min={0}
											step={0.5}
											value={formData.secondDriverHourlyRate ?? ""}
											onChange={(e) =>
												updateField(
													"secondDriverHourlyRate",
													e.target.value ? Number(e.target.value) : null
												)
											}
											placeholder="25"
											className="pr-12"
										/>
										<span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
											€/h
										</span>
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="relayDriverFixedFee">
										{t("fields.relayDriverFixedFee.label")}
									</Label>
									<div className="relative">
										<Input
											id="relayDriverFixedFee"
											type="number"
											min={0}
											step={1}
											value={formData.relayDriverFixedFee ?? ""}
											onChange={(e) =>
												updateField(
													"relayDriverFixedFee",
													e.target.value ? Number(e.target.value) : null
												)
											}
											placeholder="150"
											className="pr-8"
										/>
										<span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
											€
										</span>
									</div>
								</div>
							</div>
						</div>

						<div className="border-t" />

						{/* Link to Fleet Settings */}
						<div className="flex items-center justify-between rounded-lg border p-4">
							<div className="space-y-0.5">
								<p className="text-sm font-medium">
									{t("links.fleetSettings.title")}
								</p>
								<p className="text-sm text-muted-foreground">
									{t("links.fleetSettings.description")}
								</p>
							</div>
							<Link href={`${basePath}/fleet?tab=rse-rules`}>
								<Button variant="outline" size="sm">
									{t("links.fleetSettings.button")}
									<ExternalLinkIcon className="ml-2 size-4" />
								</Button>
							</Link>
						</div>
					</CardContent>
				</Card>

				{/* Time-Based Pricing Section */}
				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							<ClockIcon className="size-5 text-muted-foreground" />
							<CardTitle>{t("sections.timeBasedPricing.title")}</CardTitle>
						</div>
						<CardDescription>
							{t("sections.timeBasedPricing.description")}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Use Driver Home for Deadhead */}
						<div className="flex items-center justify-between rounded-lg border p-4">
							<div className="space-y-0.5">
								<div className="flex items-center gap-2">
									<p className="text-sm font-medium">
										{t("fields.useDriverHomeForDeadhead.label")}
									</p>
									<Tooltip>
										<TooltipTrigger asChild>
											<HelpCircleIcon className="size-4 text-muted-foreground cursor-help" />
										</TooltipTrigger>
										<TooltipContent className="max-w-xs">
											{t("fields.useDriverHomeForDeadhead.help")}
										</TooltipContent>
									</Tooltip>
								</div>
								<p className="text-sm text-muted-foreground">
									{t("fields.useDriverHomeForDeadhead.description")}
								</p>
							</div>
							<Switch
								checked={formData.useDriverHomeForDeadhead}
								onCheckedChange={(checked) =>
									updateField("useDriverHomeForDeadhead", checked)
								}
							/>
						</div>

						{/* Time Bucket Interpolation Strategy */}
						<div className="grid gap-2">
							<div className="flex items-center gap-2">
								<Label htmlFor="timeBucketInterpolation">
									{t("fields.timeBucketInterpolation.label")}
								</Label>
								<Tooltip>
									<TooltipTrigger asChild>
										<HelpCircleIcon className="size-4 text-muted-foreground cursor-help" />
									</TooltipTrigger>
									<TooltipContent className="max-w-xs">
										{t("fields.timeBucketInterpolation.help")}
									</TooltipContent>
								</Tooltip>
							</div>
							<Select
								value={formData.timeBucketInterpolationStrategy ?? "default"}
								onValueChange={(value) =>
									updateField(
										"timeBucketInterpolationStrategy",
										value === "default" ? null : value
									)
								}
							>
								<SelectTrigger id="timeBucketInterpolation">
									<SelectValue
										placeholder={t("fields.timeBucketInterpolation.placeholder")}
									/>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="default">
										{t("fields.timeBucketInterpolation.options.default")}
									</SelectItem>
									<SelectItem value="ROUND_UP">
										{t("fields.timeBucketInterpolation.options.ROUND_UP")}
									</SelectItem>
									<SelectItem value="ROUND_DOWN">
										{t("fields.timeBucketInterpolation.options.ROUND_DOWN")}
									</SelectItem>
									<SelectItem value="PROPORTIONAL">
										{t("fields.timeBucketInterpolation.options.PROPORTIONAL")}
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="border-t" />

						{/* Link to Dispo Packages */}
						<div className="flex items-center justify-between rounded-lg border p-4">
							<div className="space-y-0.5">
								<p className="text-sm font-medium">
									{t("links.dispoPackages.title")}
								</p>
								<p className="text-sm text-muted-foreground">
									{t("links.dispoPackages.description")}
								</p>
							</div>
							<Link href={`${basePath}/pricing/dispos`}>
								<Button variant="outline" size="sm">
									{t("links.dispoPackages.button")}
									<ExternalLinkIcon className="ml-2 size-4" />
								</Button>
							</Link>
						</div>
					</CardContent>
				</Card>

				{/* Client Scoring Section */}
				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							<UsersIcon className="size-5 text-muted-foreground" />
							<CardTitle>{t("sections.clientScoring.title")}</CardTitle>
						</div>
						<CardDescription>
							{t("sections.clientScoring.description")}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950">
							<AlertTriangleIcon className="size-5 text-yellow-600 shrink-0 mt-0.5" />
							<p className="text-sm text-yellow-800 dark:text-yellow-200">
								{t("sections.clientScoring.warning")}
							</p>
						</div>

						{/* Difficulty Multipliers Table */}
						<div className="space-y-4">
							<h4 className="text-sm font-medium">
								{t("fields.difficultyMultipliers.label")}
							</h4>
							<div className="grid gap-3">
								{["1", "2", "3", "4", "5"].map((score) => {
									const multipliers =
										formData.difficultyMultipliers ?? DEFAULT_DIFFICULTY_MULTIPLIERS;
									const value = multipliers[score] ?? DEFAULT_DIFFICULTY_MULTIPLIERS[score];
									const percentage = ((value - 1) * 100).toFixed(0);

									return (
										<div
											key={score}
											className="flex items-center gap-4 rounded-lg border p-3"
										>
											<div className="flex items-center gap-2 min-w-[120px]">
												<span className="flex size-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
													{score}
												</span>
												<span className="text-sm">
													{t(`fields.difficultyMultipliers.scores.${score}`)}
												</span>
											</div>
											<div className="flex-1">
												<Input
													type="number"
													min={0.5}
													max={3}
													step={0.01}
													value={value}
													onChange={(e) =>
														updateDifficultyMultiplier(
															score,
															Number(e.target.value) || 1
														)
													}
													className="w-24"
												/>
											</div>
											<div className="text-sm text-muted-foreground min-w-[60px] text-right">
												{Number(percentage) > 0 ? `+${percentage}%` : `${percentage}%`}
											</div>
										</div>
									);
								})}
							</div>
						</div>

						<div className="border-t" />

						{/* Link to Contacts */}
						<div className="flex items-center justify-between rounded-lg border p-4">
							<div className="space-y-0.5">
								<p className="text-sm font-medium">
									{t("links.contacts.title")}
								</p>
								<p className="text-sm text-muted-foreground">
									{t("links.contacts.description")}
								</p>
							</div>
							<Link href={`/app/${organizationSlug}/contacts`}>
								<Button variant="outline" size="sm">
									{t("links.contacts.button")}
									<ExternalLinkIcon className="ml-2 size-4" />
								</Button>
							</Link>
						</div>
					</CardContent>
				</Card>

				{/* Save Button (bottom) */}
				{hasChanges && (
					<div className="sticky bottom-4 flex justify-end">
						<Button
							onClick={handleSave}
							disabled={saveMutation.isPending}
							size="lg"
							className="shadow-lg"
						>
							{saveMutation.isPending ? (
								<Loader2Icon className="mr-2 size-4 animate-spin" />
							) : (
								<SaveIcon className="mr-2 size-4" />
							)}
							{tCommon("confirmation.save")}
						</Button>
					</div>
				)}
			</div>
		</TooltipProvider>
	);
}
