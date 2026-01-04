"use client";

/**
 * SubcontractorFeedbackDialog Component
 * Story 22.10: Advanced Subcontracting Workflow
 *
 * Dialog for submitting feedback for a subcontracted mission
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { Button } from "@ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import { Label } from "@ui/components/label";
import { Textarea } from "@ui/components/textarea";
import { useSubmitFeedback } from "../../dispatch/hooks/useSubcontracting";
import { useToast } from "@ui/hooks/use-toast";

interface SubcontractorFeedbackDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	subcontractorId: string;
	subcontractorName: string;
	quoteId: string;
	missionDescription?: string;
}

export function SubcontractorFeedbackDialog({
	open,
	onOpenChange,
	subcontractorId,
	subcontractorName,
	quoteId,
	missionDescription,
}: SubcontractorFeedbackDialogProps) {
	const t = useTranslations("subcontractors");
	const { toast } = useToast();
	const submitFeedback = useSubmitFeedback();

	const [rating, setRating] = useState(0);
	const [punctuality, setPunctuality] = useState(0);
	const [vehicleCondition, setVehicleCondition] = useState(0);
	const [driverProfessionalism, setDriverProfessionalism] = useState(0);
	const [communication, setCommunication] = useState(0);
	const [comments, setComments] = useState("");

	const handleSubmit = async () => {
		if (rating === 0) {
			toast({ title: t("feedback.ratingRequired"), variant: "error" });
			return;
		}

		try {
			await submitFeedback.mutateAsync({
				subcontractorId,
				data: {
					quoteId,
					rating,
					punctuality: punctuality > 0 ? punctuality : undefined,
					vehicleCondition: vehicleCondition > 0 ? vehicleCondition : undefined,
					driverProfessionalism: driverProfessionalism > 0 ? driverProfessionalism : undefined,
					communication: communication > 0 ? communication : undefined,
					comments: comments || undefined,
				},
			});

			toast({ title: t("feedback.success") });
			onOpenChange(false);
			resetForm();
		} catch {
			toast({ title: t("feedback.error"), variant: "error" });
		}
	};

	const resetForm = () => {
		setRating(0);
		setPunctuality(0);
		setVehicleCondition(0);
		setDriverProfessionalism(0);
		setCommunication(0);
		setComments("");
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>{t("feedback.title")}</DialogTitle>
					<DialogDescription>
						{t("feedback.description", { name: subcontractorName })}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{missionDescription && (
						<div className="rounded-lg bg-muted p-3">
							<p className="text-sm text-muted-foreground">{missionDescription}</p>
						</div>
					)}

					{/* Overall Rating (Required) */}
					<div className="space-y-2">
						<Label className="flex items-center gap-1">
							{t("feedback.overallRating")}
							<span className="text-destructive">*</span>
						</Label>
						<StarRating value={rating} onChange={setRating} />
					</div>

					{/* Detailed Ratings (Optional) */}
					<div className="space-y-3">
						<Label className="text-sm text-muted-foreground">
							{t("feedback.detailedRatings")}
						</Label>

						<div className="grid gap-3">
							<div className="flex items-center justify-between">
								<span className="text-sm">{t("feedback.punctuality")}</span>
								<StarRating value={punctuality} onChange={setPunctuality} size="sm" />
							</div>
							<div className="flex items-center justify-between">
								<span className="text-sm">{t("feedback.vehicleCondition")}</span>
								<StarRating value={vehicleCondition} onChange={setVehicleCondition} size="sm" />
							</div>
							<div className="flex items-center justify-between">
								<span className="text-sm">{t("feedback.professionalism")}</span>
								<StarRating value={driverProfessionalism} onChange={setDriverProfessionalism} size="sm" />
							</div>
							<div className="flex items-center justify-between">
								<span className="text-sm">{t("feedback.communication")}</span>
								<StarRating value={communication} onChange={setCommunication} size="sm" />
							</div>
						</div>
					</div>

					{/* Comments */}
					<div className="space-y-2">
						<Label htmlFor="comments">{t("feedback.comments")}</Label>
						<Textarea
							id="comments"
							value={comments}
							onChange={(e) => setComments(e.target.value)}
							placeholder={t("feedback.commentsPlaceholder")}
							rows={3}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{t("dialog.cancel")}
					</Button>
					<Button onClick={handleSubmit} disabled={submitFeedback.isPending}>
						{submitFeedback.isPending ? t("feedback.submitting") : t("feedback.submit")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function StarRating({
	value,
	onChange,
	size = "md",
}: {
	value: number;
	onChange: (value: number) => void;
	size?: "sm" | "md";
}) {
	const [hovered, setHovered] = useState(0);
	const starSize = size === "sm" ? "h-4 w-4" : "h-6 w-6";

	return (
		<div className="flex gap-1">
			{[1, 2, 3, 4, 5].map((star) => (
				<button
					key={star}
					type="button"
					className="focus:outline-none"
					onMouseEnter={() => setHovered(star)}
					onMouseLeave={() => setHovered(0)}
					onClick={() => onChange(star === value ? 0 : star)}
				>
					<Star
						className={`${starSize} transition-colors ${
							star <= (hovered || value)
								? "fill-yellow-400 text-yellow-400"
								: "text-muted-foreground hover:text-yellow-300"
						}`}
					/>
				</button>
			))}
		</div>
	);
}

export default SubcontractorFeedbackDialog;
