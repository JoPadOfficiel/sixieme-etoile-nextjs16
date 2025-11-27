"use client";

/**
 * SubcontractingDialog Component
 * Story 8.6: Integrate Subcontractor Directory & Subcontracting Suggestions
 *
 * Confirmation dialog for subcontracting a mission.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Loader2 } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { Textarea } from "@ui/components/textarea";
import { useToast } from "@ui/hooks/use-toast";
import { useSubcontractMission } from "../hooks/useSubcontracting";
import type { SubcontractingSuggestion } from "../types/subcontractor";
import { formatPrice } from "../types/subcontractor";

interface SubcontractingDialogProps {
	isOpen: boolean;
	onClose: () => void;
	missionId: string;
	suggestion: SubcontractingSuggestion;
	sellingPrice: number;
}

export function SubcontractingDialog({
	isOpen,
	onClose,
	missionId,
	suggestion,
	sellingPrice,
}: SubcontractingDialogProps) {
	const t = useTranslations("dispatch.subcontracting.dialog");
	const { toast } = useToast();

	const [agreedPrice, setAgreedPrice] = useState<string>(
		suggestion.estimatedPrice.toFixed(2)
	);
	const [notes, setNotes] = useState<string>("");

	const subcontractMutation = useSubcontractMission();

	const handleSubmit = async () => {
		const price = parseFloat(agreedPrice);
		if (isNaN(price) || price <= 0) {
			toast({
				title: "Invalid price",
				description: "Please enter a valid price",
				variant: "error",
			});
			return;
		}

		try {
			await subcontractMutation.mutateAsync({
				missionId,
				data: {
					subcontractorId: suggestion.subcontractorId,
					agreedPrice: price,
					notes: notes || undefined,
				},
			});

			toast({
				title: t("success"),
				description: `Mission subcontracted to ${
					suggestion.subcontractor.companyName || suggestion.subcontractor.displayName
				}`,
			});

			onClose();
		} catch (error) {
			toast({
				title: t("error"),
				description: error instanceof Error ? error.message : "Failed to subcontract mission",
				variant: "error",
			});
		}
	};

	const agreedPriceNum = parseFloat(agreedPrice) || 0;
	const margin = sellingPrice - agreedPriceNum;
	const marginPercent = sellingPrice > 0 ? (margin / sellingPrice) * 100 : 0;

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-md" data-testid="subcontract-dialog">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Building2 className="h-5 w-5" />
						{t("title")}
					</DialogTitle>
					<DialogDescription>
						{t("description", {
							name:
								suggestion.subcontractor.companyName ||
								suggestion.subcontractor.displayName,
						})}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{/* Subcontractor Info */}
					<div className="p-3 bg-muted/50 rounded-lg">
						<p className="font-medium">
							{suggestion.subcontractor.companyName ||
								suggestion.subcontractor.displayName}
						</p>
						{suggestion.subcontractor.email && (
							<p className="text-sm text-muted-foreground">
								{suggestion.subcontractor.email}
							</p>
						)}
						{suggestion.subcontractor.phone && (
							<p className="text-sm text-muted-foreground">
								{suggestion.subcontractor.phone}
							</p>
						)}
					</div>

					{/* Agreed Price */}
					<div className="space-y-2">
						<Label htmlFor="agreedPrice">{t("agreedPrice")}</Label>
						<div className="relative">
							<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
								€
							</span>
							<Input
								id="agreedPrice"
								type="number"
								step="0.01"
								min="0"
								value={agreedPrice}
								onChange={(e) => setAgreedPrice(e.target.value)}
								className="pl-7"
								data-testid="agreed-price-input"
							/>
						</div>
						<p className="text-xs text-muted-foreground">
							Estimated: {formatPrice(suggestion.estimatedPrice)}
						</p>
					</div>

					{/* Margin Preview */}
					<div className="p-3 border rounded-lg">
						<div className="flex justify-between text-sm">
							<span>Selling Price:</span>
							<span>{formatPrice(sellingPrice)}</span>
						</div>
						<div className="flex justify-between text-sm mt-1">
							<span>Subcontractor Cost:</span>
							<span>{formatPrice(agreedPriceNum)}</span>
						</div>
						<div className="flex justify-between font-medium mt-2 pt-2 border-t">
							<span>Resulting Margin:</span>
							<span className={margin >= 0 ? "text-green-600" : "text-red-600"}>
								{formatPrice(margin)} ({marginPercent.toFixed(1)}%)
							</span>
						</div>
					</div>

					{/* Notes */}
					<div className="space-y-2">
						<Label htmlFor="notes">{t("notes")}</Label>
						<Textarea
							id="notes"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Optional notes..."
							rows={2}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={subcontractMutation.isPending}>
						{t("cancel")}
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={subcontractMutation.isPending}
						data-testid="confirm-subcontract"
					>
						{subcontractMutation.isPending && (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						)}
						{t("confirm")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default SubcontractingDialog;
