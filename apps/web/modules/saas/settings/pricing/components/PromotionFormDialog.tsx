"use client";

/**
 * Promotion Form Dialog
 * Story 9.4: Settings → Pricing – Promotions & Promo Codes
 *
 * Dialog for creating and editing promotions
 */

import { Button } from "@ui/components/button";
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
import { Textarea } from "@ui/components/textarea";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type {
	Promotion,
	CreatePromotionRequest,
	UpdatePromotionRequest,
	DiscountType,
} from "../types/promotion";
import { formatDateForInput } from "../types/promotion";

interface PromotionFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	promotion: Promotion | null;
	onSubmit: (
		data: CreatePromotionRequest | UpdatePromotionRequest
	) => Promise<void>;
	isSubmitting: boolean;
}

export function PromotionFormDialog({
	open,
	onOpenChange,
	promotion,
	onSubmit,
	isSubmitting,
}: PromotionFormDialogProps) {
	const t = useTranslations("settings.pricing.promotions");
	const isEditing = !!promotion;

	// Form state
	const [code, setCode] = useState("");
	const [description, setDescription] = useState("");
	const [discountType, setDiscountType] = useState<DiscountType>("FIXED");
	const [value, setValue] = useState(0);
	const [validFrom, setValidFrom] = useState("");
	const [validTo, setValidTo] = useState("");
	const [maxTotalUses, setMaxTotalUses] = useState<string>("");
	const [maxUsesPerContact, setMaxUsesPerContact] = useState<string>("");
	const [isActive, setIsActive] = useState(true);

	// Validation errors
	const [errors, setErrors] = useState<Record<string, string>>({});

	// Get today's date in YYYY-MM-DD format
	const getTodayDate = () => {
		return new Date().toISOString().split("T")[0];
	};

	// Reset form when dialog opens or promotion changes
	useEffect(() => {
		if (open) {
			if (promotion) {
				setCode(promotion.code);
				setDescription(promotion.description || "");
				setDiscountType(promotion.discountType);
				setValue(promotion.value);
				setValidFrom(formatDateForInput(promotion.validFrom));
				setValidTo(formatDateForInput(promotion.validTo));
				setMaxTotalUses(
					promotion.maxTotalUses !== null
						? promotion.maxTotalUses.toString()
						: ""
				);
				setMaxUsesPerContact(
					promotion.maxUsesPerContact !== null
						? promotion.maxUsesPerContact.toString()
						: ""
				);
				setIsActive(promotion.isActive);
			} else {
				// Default values for new promotion
				const today = getTodayDate();
				setCode("");
				setDescription("");
				setDiscountType("FIXED");
				setValue(0);
				setValidFrom(today);
				setValidTo(today);
				setMaxTotalUses("");
				setMaxUsesPerContact("");
				setIsActive(true);
			}
			setErrors({});
		}
	}, [open, promotion]);

	// Reset form when dialog closes to prevent state leakage (Story 23.3 fix)
	useEffect(() => {
		if (!open) {
			// Small delay to ensure backdrop is properly removed
			const timer = setTimeout(() => {
				const today = getTodayDate();
				setCode("");
				setDescription("");
				setDiscountType("FIXED");
				setValue(0);
				setValidFrom(today);
				setValidTo(today);
				setMaxTotalUses("");
				setMaxUsesPerContact("");
				setIsActive(true);
				setErrors({});
			}, 100);
			
			return () => clearTimeout(timer);
		}
	}, [open]);

	const validate = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (!code.trim()) {
			newErrors.code = "Code is required";
		} else if (code.length > 50) {
			newErrors.code = "Code too long (max 50 characters)";
		}

		if (value <= 0) {
			newErrors.value = "Value must be positive";
		}

		if (!validFrom) {
			newErrors.validFrom = "Valid From date is required";
		}

		if (!validTo) {
			newErrors.validTo = "Valid To date is required";
		}

		if (validFrom && validTo && new Date(validTo) < new Date(validFrom)) {
			newErrors.validTo = "Valid To must be after or equal to Valid From";
		}

		if (maxTotalUses && parseInt(maxTotalUses) <= 0) {
			newErrors.maxTotalUses = "Must be a positive number";
		}

		if (maxUsesPerContact && parseInt(maxUsesPerContact) <= 0) {
			newErrors.maxUsesPerContact = "Must be a positive number";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validate()) return;

		const data: CreatePromotionRequest = {
			code: code.trim().toUpperCase(),
			description: description.trim() || null,
			discountType,
			value,
			validFrom: new Date(validFrom).toISOString(),
			validTo: new Date(validTo + "T23:59:59").toISOString(),
			maxTotalUses: maxTotalUses ? parseInt(maxTotalUses) : null,
			maxUsesPerContact: maxUsesPerContact ? parseInt(maxUsesPerContact) : null,
			isActive,
		};

		await onSubmit(data);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]" data-testid="promotion-dialog">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>
							{isEditing ? t("form.editTitle") : t("form.createTitle")}
						</DialogTitle>
						<DialogDescription>
							{t("description")}
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						{/* Code */}
						<div className="grid gap-2">
							<Label htmlFor="code">{t("form.code")} *</Label>
							<Input
								id="code"
								value={code}
								onChange={(e) => setCode(e.target.value.toUpperCase())}
								placeholder={t("form.codePlaceholder")}
								className="font-mono uppercase"
								data-testid="code-input"
							/>
							<p className="text-xs text-muted-foreground">{t("form.codeHelp")}</p>
							{errors.code && (
								<p className="text-sm text-destructive">{errors.code}</p>
							)}
							{isEditing && promotion && promotion.currentUses > 0 && (
								<p className="text-xs text-muted-foreground">
									{t("form.currentUses")}: {promotion.currentUses}
								</p>
							)}
						</div>

						{/* Description */}
						<div className="grid gap-2">
							<Label htmlFor="description">{t("form.description")}</Label>
							<Textarea
								id="description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder={t("form.descriptionPlaceholder")}
								rows={2}
								data-testid="description-input"
							/>
						</div>

						{/* Discount Type and Value */}
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="discountType">{t("form.discountType")} *</Label>
								<Select
									value={discountType}
									onValueChange={(value) => setDiscountType(value as DiscountType)}
								>
									<SelectTrigger data-testid="discount-type-select">
										<SelectValue placeholder={t("form.discountTypePlaceholder")} />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="FIXED">{t("types.FIXED")}</SelectItem>
										<SelectItem value="PERCENTAGE">{t("types.PERCENTAGE")}</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="value">
									{t("form.value")} {discountType === "FIXED" ? "(€)" : "(%)"} *
								</Label>
								<Input
									id="value"
									type="number"
									min={0}
									step={discountType === "FIXED" ? 0.01 : 1}
									value={value}
									onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
									data-testid="value-input"
								/>
								{errors.value && (
									<p className="text-sm text-destructive">{errors.value}</p>
								)}
							</div>
						</div>
						<p className="text-xs text-muted-foreground">{t("form.valueHelp")}</p>

						{/* Validity Period */}
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="validFrom">{t("form.validFrom")} *</Label>
								<Input
									id="validFrom"
									type="date"
									value={validFrom}
									onChange={(e) => setValidFrom(e.target.value)}
									data-testid="valid-from-input"
								/>
								{errors.validFrom && (
									<p className="text-sm text-destructive">{errors.validFrom}</p>
								)}
							</div>
							<div className="grid gap-2">
								<Label htmlFor="validTo">{t("form.validTo")} *</Label>
								<Input
									id="validTo"
									type="date"
									value={validTo}
									min={validFrom}
									onChange={(e) => setValidTo(e.target.value)}
									data-testid="valid-to-input"
								/>
								{errors.validTo && (
									<p className="text-sm text-destructive">{errors.validTo}</p>
								)}
							</div>
						</div>
						<p className="text-xs text-muted-foreground">{t("form.validityHelp")}</p>

						{/* Usage Limits */}
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="maxTotalUses">{t("form.maxTotalUses")}</Label>
								<Input
									id="maxTotalUses"
									type="number"
									min={1}
									value={maxTotalUses}
									onChange={(e) => setMaxTotalUses(e.target.value)}
									placeholder="∞"
									data-testid="max-total-uses-input"
								/>
								<p className="text-xs text-muted-foreground">{t("form.maxTotalUsesHelp")}</p>
								{errors.maxTotalUses && (
									<p className="text-sm text-destructive">{errors.maxTotalUses}</p>
								)}
							</div>
							<div className="grid gap-2">
								<Label htmlFor="maxUsesPerContact">{t("form.maxUsesPerContact")}</Label>
								<Input
									id="maxUsesPerContact"
									type="number"
									min={1}
									value={maxUsesPerContact}
									onChange={(e) => setMaxUsesPerContact(e.target.value)}
									placeholder="∞"
									data-testid="max-uses-per-contact-input"
								/>
								<p className="text-xs text-muted-foreground">{t("form.maxUsesPerContactHelp")}</p>
								{errors.maxUsesPerContact && (
									<p className="text-sm text-destructive">{errors.maxUsesPerContact}</p>
								)}
							</div>
						</div>

						{/* Active Toggle */}
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label htmlFor="isActive">{t("form.isActive")}</Label>
							</div>
							<Switch
								id="isActive"
								checked={isActive}
								onCheckedChange={setIsActive}
								data-testid="active-toggle"
							/>
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isSubmitting}
						>
							{t("form.cancel")}
						</Button>
						<Button type="submit" disabled={isSubmitting} data-testid="submit-button">
							{isSubmitting
								? "..."
								: isEditing
									? t("form.save")
									: t("form.create")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
