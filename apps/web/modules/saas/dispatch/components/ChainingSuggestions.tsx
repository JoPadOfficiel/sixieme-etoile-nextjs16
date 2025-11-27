"use client";

import { useState } from "react";
import { Link2, ArrowRight, TrendingDown, CheckCircle2, AlertCircle } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@ui/components/card";
import { Button } from "@ui/components/button";
import { Badge } from "@ui/components/badge";
import { Skeleton } from "@ui/components/skeleton";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import { useChainingSuggestions, useApplyChain } from "../hooks";
import type { ChainingSuggestion, ChainSourceMission } from "../types";
import { useToast } from "@ui/hooks/use-toast";

/**
 * ChainingSuggestions Component
 *
 * Story 8.4: Detect & Suggest Trip Chaining Opportunities
 *
 * Displays chaining suggestions for a selected mission and allows
 * the dispatcher to apply chains to reduce deadhead segments.
 */

interface ChainingSuggestionsProps {
	missionId: string | null;
	onChainApplied?: () => void;
}

export function ChainingSuggestions({
	missionId,
	onChainApplied,
}: ChainingSuggestionsProps) {
	const { toast } = useToast();
	const [selectedSuggestion, setSelectedSuggestion] = useState<ChainingSuggestion | null>(null);
	const [showConfirmDialog, setShowConfirmDialog] = useState(false);

	const { data, isLoading, error } = useChainingSuggestions({
		missionId,
		enabled: !!missionId,
	});

	const applyChainMutation = useApplyChain({
		onSuccess: (result) => {
			toast({
				title: "Chain Applied",
				description: `Saved ${result.totalSavings.distanceKm} km (€${result.totalSavings.costEur.toFixed(2)})`,
			});
			setShowConfirmDialog(false);
			setSelectedSuggestion(null);
			onChainApplied?.();
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error.message,
				variant: "error",
			});
		},
	});

	const handleApplyChain = () => {
		if (!missionId || !selectedSuggestion) return;

		applyChainMutation.mutate({
			missionId,
			targetMissionId: selectedSuggestion.targetMissionId,
			chainOrder: selectedSuggestion.chainOrder,
		});
	};

	// Don't render if no mission selected
	if (!missionId) return null;

	// Loading state
	if (isLoading) {
		return <ChainingSuggestionsSkeleton />;
	}

	// Error state
	if (error) {
		return null; // Silently fail - chaining is optional
	}

	// No suggestions
	if (!data?.suggestions.length) {
		return null;
	}

	return (
		<>
			<Card className="mt-4" data-testid="chaining-suggestions">
				<CardHeader className="pb-2">
					<CardTitle className="text-sm flex items-center gap-2">
						<Link2 className="h-4 w-4 text-blue-500" />
						Chaining Opportunities
					</CardTitle>
					<CardDescription>
						{data.suggestions.length} mission(s) can be chained to reduce deadhead
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						{data.suggestions.map((suggestion) => (
							<ChainingSuggestionRow
								key={suggestion.targetMissionId}
								suggestion={suggestion}
								onApply={() => {
									setSelectedSuggestion(suggestion);
									setShowConfirmDialog(true);
								}}
							/>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Confirmation Dialog */}
			<ChainConfirmDialog
				open={showConfirmDialog}
				onOpenChange={setShowConfirmDialog}
				suggestion={selectedSuggestion}
				sourceMission={data?.mission || null}
				onConfirm={handleApplyChain}
				isLoading={applyChainMutation.isPending}
			/>
		</>
	);
}

/**
 * Individual suggestion row
 */
interface ChainingSuggestionRowProps {
	suggestion: ChainingSuggestion;
	onApply: () => void;
}

function ChainingSuggestionRow({ suggestion, onApply }: ChainingSuggestionRowProps) {
	const { targetMission, chainOrder, transition, savings, compatibility, isRecommended } = suggestion;

	return (
		<div
			className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
			data-testid="chaining-suggestion-row"
		>
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 mb-1">
					<span className="text-sm font-medium truncate">
						{targetMission.contact.displayName}
					</span>
					{isRecommended && (
						<Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
							Recommended
						</Badge>
					)}
				</div>
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					<span className="truncate max-w-[150px]">
						{chainOrder === "AFTER" ? "Chain after" : "Chain before"}
					</span>
					<ArrowRight className="h-3 w-3 flex-shrink-0" />
					<span className="truncate max-w-[150px]">
						{targetMission.pickupAddress}
					</span>
				</div>
				<div className="flex items-center gap-3 mt-1">
					<span className="text-xs text-muted-foreground">
						{transition.distanceKm.toFixed(1)} km, {transition.durationMinutes} min
					</span>
					<span className="text-xs font-medium text-green-600 flex items-center gap-1" data-testid="chaining-savings">
						<TrendingDown className="h-3 w-3" />
						Save {savings.distanceKm.toFixed(1)} km (€{savings.costEur.toFixed(2)})
					</span>
				</div>
			</div>

			<div className="flex items-center gap-2 ml-2">
				<CompatibilityIndicator compatibility={compatibility} />
				<Button
					size="sm"
					variant="outline"
					onClick={onApply}
					data-testid="apply-chain-button"
				>
					Apply
				</Button>
			</div>
		</div>
	);
}

/**
 * Compatibility indicator icons
 */
interface CompatibilityIndicatorProps {
	compatibility: ChainingSuggestion["compatibility"];
}

function CompatibilityIndicator({ compatibility }: CompatibilityIndicatorProps) {
	const allGood = Object.values(compatibility).every(Boolean);

	if (allGood) {
		return <CheckCircle2 className="h-4 w-4 text-green-500" />;
	}

	return (
		<div className="flex items-center gap-1">
			{!compatibility.vehicleCategory && (
				<span title="Different vehicle category">
					<AlertCircle className="h-4 w-4 text-amber-500" />
				</span>
			)}
			{!compatibility.timeGap && (
				<span title="Time gap issue">
					<AlertCircle className="h-4 w-4 text-amber-500" />
				</span>
			)}
			{!compatibility.rseCompliance && (
				<span title="RSE compliance issue">
					<AlertCircle className="h-4 w-4 text-red-500" />
				</span>
			)}
			{!compatibility.noConflicts && (
				<span title="Chain conflict">
					<AlertCircle className="h-4 w-4 text-red-500" />
				</span>
			)}
		</div>
	);
}

/**
 * Confirmation dialog for applying a chain
 */
interface ChainConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	suggestion: ChainingSuggestion | null;
	sourceMission: ChainSourceMission | null;
	onConfirm: () => void;
	isLoading: boolean;
}

function ChainConfirmDialog({
	open,
	onOpenChange,
	suggestion,
	sourceMission,
	onConfirm,
	isLoading,
}: ChainConfirmDialogProps) {
	if (!suggestion || !sourceMission) return null;

	const { targetMission, chainOrder, savings, transition } = suggestion;

	// Determine which mission comes first
	const firstMission = chainOrder === "AFTER" ? sourceMission : targetMission;
	const secondMission = chainOrder === "AFTER" ? targetMission : sourceMission;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]" data-testid="chain-confirm-dialog">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Link2 className="h-5 w-5 text-blue-500" />
						Confirm Chain
					</DialogTitle>
					<DialogDescription>
						You are about to chain these two missions together.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{/* Mission 1 */}
					<div className="p-3 rounded-lg bg-muted">
						<div className="text-xs text-muted-foreground mb-1">Mission 1</div>
						<div className="font-medium text-sm">
							{firstMission.pickupAddress}
						</div>
						<div className="text-xs text-muted-foreground">
							→ {firstMission.dropoffAddress}
						</div>
					</div>

					{/* Transition */}
					<div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
						<ArrowRight className="h-4 w-4" />
						<span>
							{transition.distanceKm.toFixed(1)} km, {transition.durationMinutes} min transition
						</span>
					</div>

					{/* Mission 2 */}
					<div className="p-3 rounded-lg bg-muted">
						<div className="text-xs text-muted-foreground mb-1">Mission 2</div>
						<div className="font-medium text-sm">
							{secondMission.pickupAddress}
						</div>
						<div className="text-xs text-muted-foreground">
							→ {secondMission.dropoffAddress}
						</div>
					</div>

					{/* Savings */}
					<div className="p-3 rounded-lg bg-green-50 border border-green-200">
						<div className="text-xs text-green-700 mb-1">Estimated Savings</div>
						<div className="flex items-center gap-4">
							<div>
								<span className="text-lg font-bold text-green-700">
									{savings.distanceKm.toFixed(1)} km
								</span>
								<span className="text-xs text-green-600 ml-1">saved</span>
							</div>
							<div>
								<span className="text-lg font-bold text-green-700">
									€{savings.costEur.toFixed(2)}
								</span>
								<span className="text-xs text-green-600 ml-1">saved</span>
							</div>
							<div>
								<span className="text-lg font-bold text-green-700">
									{savings.percentReduction.toFixed(0)}%
								</span>
								<span className="text-xs text-green-600 ml-1">reduction</span>
							</div>
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isLoading}
					>
						Cancel
					</Button>
					<Button
						onClick={onConfirm}
						disabled={isLoading}
						data-testid="confirm-chain-button"
					>
						{isLoading ? "Applying..." : "Confirm Chain"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/**
 * Loading skeleton
 */
function ChainingSuggestionsSkeleton() {
	return (
		<Card className="mt-4">
			<CardHeader className="pb-2">
				<Skeleton className="h-4 w-40" />
				<Skeleton className="h-3 w-60 mt-1" />
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					<Skeleton className="h-20 w-full" />
					<Skeleton className="h-20 w-full" />
				</div>
			</CardContent>
		</Card>
	);
}
