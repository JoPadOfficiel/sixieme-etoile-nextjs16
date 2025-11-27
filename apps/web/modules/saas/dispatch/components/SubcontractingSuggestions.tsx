"use client";

/**
 * SubcontractingSuggestions Component
 * Story 8.6: Integrate Subcontractor Directory & Subcontracting Suggestions
 *
 * Displays subcontracting suggestions for unprofitable missions
 * with margin comparison and action buttons.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
	AlertTriangle,
	Building2,
	ChevronDown,
	ChevronUp,
	ExternalLink,
	MapPin,
	Phone,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Button } from "@ui/components/button";
import { Badge } from "@ui/components/badge";
import { Skeleton } from "@ui/components/skeleton";
import { cn } from "@ui/lib";
import { useSubcontractingSuggestions } from "../hooks/useSubcontracting";
import { SubcontractingDialog } from "./SubcontractingDialog";
import type { SubcontractingSuggestion } from "../types/subcontractor";
import {
	formatPrice,
	formatPercent,
	getRecommendationColor,
	getZoneMatchLabel,
} from "../types/subcontractor";

interface SubcontractingSuggestionsProps {
	missionId: string | null;
	className?: string;
}

export function SubcontractingSuggestions({
	missionId,
	className,
}: SubcontractingSuggestionsProps) {
	const t = useTranslations("dispatch.subcontracting");
	const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
	const [selectedSuggestion, setSelectedSuggestion] = useState<SubcontractingSuggestion | null>(
		null
	);
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	const { data, isLoading, error } = useSubcontractingSuggestions({
		missionId,
		enabled: !!missionId,
	});

	if (!missionId) {
		return null;
	}

	if (isLoading) {
		return (
			<Card className={className} data-testid="subcontracting-suggestions-loading">
				<CardHeader className="pb-2">
					<Skeleton className="h-5 w-40" />
				</CardHeader>
				<CardContent>
					<Skeleton className="h-20 w-full" />
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return null; // Silently fail - subcontracting is optional
	}

	if (!data) {
		return null;
	}

	// Don't show if mission is profitable and no suggestions
	if (!data.isUnprofitable && data.suggestions.length === 0) {
		return null;
	}

	const handleSubcontract = (suggestion: SubcontractingSuggestion) => {
		setSelectedSuggestion(suggestion);
		setIsDialogOpen(true);
	};

	const handleDialogClose = () => {
		setIsDialogOpen(false);
		setSelectedSuggestion(null);
	};

	return (
		<>
			<Card className={className} data-testid="subcontracting-suggestions">
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-medium flex items-center gap-2">
						<Building2 className="h-4 w-4" />
						{t("title")}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{/* Unprofitable Alert */}
					{data.isUnprofitable && (
						<div
							className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg"
							data-testid="unprofitable-alert"
						>
							<AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
							<div className="text-sm">
								<p className="font-medium text-amber-800">{t("unprofitableAlert")}</p>
								<p className="text-amber-700 mt-0.5">
									{t("marginBelow", {
										percent: data.mission.marginPercent.toFixed(1),
										threshold: data.unprofitableThreshold,
									})}
								</p>
							</div>
						</div>
					)}

					{/* Suggestions List */}
					{data.suggestions.length === 0 ? (
						<p className="text-sm text-muted-foreground">{t("noSuggestions")}</p>
					) : (
						<div className="space-y-2">
							{data.suggestions.map((suggestion) => (
								<SuggestionCard
									key={suggestion.subcontractorId}
									suggestion={suggestion}
									mission={data.mission}
									isExpanded={expandedSuggestion === suggestion.subcontractorId}
									onToggleExpand={() =>
										setExpandedSuggestion(
											expandedSuggestion === suggestion.subcontractorId
												? null
												: suggestion.subcontractorId
										)
									}
									onSubcontract={() => handleSubcontract(suggestion)}
								/>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Subcontracting Dialog */}
			{selectedSuggestion && (
				<SubcontractingDialog
					isOpen={isDialogOpen}
					onClose={handleDialogClose}
					missionId={missionId}
					suggestion={selectedSuggestion}
					sellingPrice={data.mission.sellingPrice}
				/>
			)}
		</>
	);
}

// ============================================================================
// Suggestion Card Component
// ============================================================================

interface SuggestionCardProps {
	suggestion: SubcontractingSuggestion;
	mission: { sellingPrice: number; internalCost: number; marginPercent: number };
	isExpanded: boolean;
	onToggleExpand: () => void;
	onSubcontract: () => void;
}

function SuggestionCard({
	suggestion,
	mission,
	isExpanded,
	onToggleExpand,
	onSubcontract,
}: SuggestionCardProps) {
	const t = useTranslations("dispatch.subcontracting");

	const { comparison, zoneMatch } = suggestion;
	const isRecommended = comparison.recommendation === "SUBCONTRACT";

	return (
		<div
			className={cn(
				"border rounded-lg overflow-hidden",
				isRecommended && "border-green-200 bg-green-50/30"
			)}
			data-testid="suggestion-row"
		>
			{/* Header */}
			<button
				type="button"
				onClick={onToggleExpand}
				className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
			>
				<div className="flex items-center gap-3">
					<div className="flex-shrink-0">
						<Building2 className="h-5 w-5 text-muted-foreground" />
					</div>
					<div className="text-left">
						<p className="font-medium text-sm">
							{suggestion.subcontractor.companyName ||
								suggestion.subcontractor.displayName}
						</p>
						<div className="flex items-center gap-2 mt-0.5">
							<span className="text-xs text-muted-foreground">
								{t("suggestion.estimatedPrice", {
									price: suggestion.estimatedPrice.toFixed(2),
								})}
							</span>
							<Badge
								variant="outline"
								className={cn("text-xs", getRecommendationColor(comparison.recommendation))}
							>
								{comparison.recommendation === "SUBCONTRACT" && (
									<TrendingUp className="h-3 w-3 mr-1" />
								)}
								{comparison.recommendation === "INTERNAL" && (
									<TrendingDown className="h-3 w-3 mr-1" />
								)}
								{formatPercent(suggestion.marginPercentIfSubcontracted)}
							</Badge>
						</div>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Badge variant="secondary" className="text-xs">
						<MapPin className="h-3 w-3 mr-1" />
						{getZoneMatchLabel(zoneMatch)}
					</Badge>
					{isExpanded ? (
						<ChevronUp className="h-4 w-4 text-muted-foreground" />
					) : (
						<ChevronDown className="h-4 w-4 text-muted-foreground" />
					)}
				</div>
			</button>

			{/* Expanded Content */}
			{isExpanded && (
					<div className="px-3 pb-3 pt-0 border-t" data-testid="margin-comparison">
						{/* Contact Info */}
						<div className="flex items-center gap-4 py-2 text-xs text-muted-foreground">
							{suggestion.subcontractor.email && (
								<a
									href={`mailto:${suggestion.subcontractor.email}`}
									className="flex items-center gap-1 hover:text-foreground"
								>
									<ExternalLink className="h-3 w-3" />
									{suggestion.subcontractor.email}
								</a>
							)}
							{suggestion.subcontractor.phone && (
								<a
									href={`tel:${suggestion.subcontractor.phone}`}
									className="flex items-center gap-1 hover:text-foreground"
								>
									<Phone className="h-3 w-3" />
									{suggestion.subcontractor.phone}
								</a>
							)}
						</div>

						{/* Margin Comparison Table */}
						<div className="mt-2 rounded border overflow-hidden">
							<table className="w-full text-xs">
								<thead className="bg-muted/50">
									<tr>
										<th className="px-2 py-1.5 text-left font-medium">
											{t("comparison.title")}
										</th>
										<th className="px-2 py-1.5 text-right font-medium">
											{t("comparison.internal")}
										</th>
										<th className="px-2 py-1.5 text-right font-medium">
											{t("comparison.subcontractor")}
										</th>
									</tr>
								</thead>
								<tbody>
									<tr className="border-t">
										<td className="px-2 py-1.5">{t("comparison.sellingPrice")}</td>
										<td className="px-2 py-1.5 text-right">
											{formatPrice(mission.sellingPrice)}
										</td>
										<td className="px-2 py-1.5 text-right">
											{formatPrice(mission.sellingPrice)}
										</td>
									</tr>
									<tr className="border-t">
										<td className="px-2 py-1.5">{t("comparison.cost")}</td>
										<td className="px-2 py-1.5 text-right">
											{formatPrice(comparison.internalCost)}
										</td>
										<td className="px-2 py-1.5 text-right">
											{formatPrice(comparison.subcontractorCost)}
										</td>
									</tr>
									<tr className="border-t font-medium">
										<td className="px-2 py-1.5">{t("comparison.margin")}</td>
										<td
											className={`px-2 py-1.5 text-right ${
												mission.marginPercent < 0 ? "text-red-600" : "text-green-600"
											}`}
										>
											{formatPrice(mission.sellingPrice - comparison.internalCost)} (
											{mission.marginPercent.toFixed(1)}%)
										</td>
										<td
											className={`px-2 py-1.5 text-right ${
												suggestion.marginPercentIfSubcontracted < 0
													? "text-red-600"
													: "text-green-600"
											}`}
										>
											{formatPrice(suggestion.marginIfSubcontracted)} (
											{suggestion.marginPercentIfSubcontracted.toFixed(1)}%)
										</td>
									</tr>
									<tr className="border-t bg-muted/30">
										<td className="px-2 py-1.5">{t("comparison.recommendation")}</td>
										<td className="px-2 py-1.5 text-right">
											{mission.marginPercent < 0 ? (
												<span className="text-red-600">{t("comparison.loss")}</span>
											) : (
												<span className="text-green-600">{t("comparison.profit")}</span>
											)}
										</td>
										<td className="px-2 py-1.5 text-right">
											{suggestion.marginPercentIfSubcontracted < 0 ? (
												<span className="text-red-600">{t("comparison.loss")}</span>
											) : (
												<span className="text-green-600">{t("comparison.profit")}</span>
											)}
										</td>
									</tr>
								</tbody>
							</table>
						</div>

						{/* Action Button */}
						<div className="mt-3 flex justify-end">
							<Button
								size="sm"
								onClick={onSubcontract}
								variant={isRecommended ? "default" : "outline"}
								data-testid="subcontract-button"
							>
								{t("action.subcontract", {
									name:
										suggestion.subcontractor.companyName ||
										suggestion.subcontractor.displayName,
								})}
							</Button>
						</div>
					</div>
				)}
			</div>
	);
}

export default SubcontractingSuggestions;
