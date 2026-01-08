"use client";

/**
 * Optional Fee Form Dialog
 * Story 9.3: Settings → Pricing – Optional Fees Catalogue
 *
 * Dialog for creating and editing optional fees
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
	OptionalFee,
	CreateOptionalFeeRequest,
	UpdateOptionalFeeRequest,
	AmountType,
	AutoApplyRule,
	AutoApplyRuleType,
} from "../types/optional-fee";

interface OptionalFeeFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	fee: OptionalFee | null;
	onSubmit: (
		data: CreateOptionalFeeRequest | UpdateOptionalFeeRequest
	) => Promise<void>;
	isSubmitting: boolean;
}

const AUTO_APPLY_RULE_TYPES: AutoApplyRuleType[] = [
	"AIRPORT_PICKUP",
	"AIRPORT_DROPOFF",
	"BAGGAGE_OVER_CAPACITY",
	"NIGHT_SERVICE",
];

export function OptionalFeeFormDialog({
	open,
	onOpenChange,
	fee,
	onSubmit,
	isSubmitting,
}: OptionalFeeFormDialogProps) {
	const t = useTranslations("settings.pricing.optionalFees");
	const isEditing = !!fee;

	// Form state
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [amountType, setAmountType] = useState<AmountType>("FIXED");
	const [amount, setAmount] = useState(0);
	const [isTaxable, setIsTaxable] = useState(true);
	const [vatRate, setVatRate] = useState(20);
	const [autoApplyRules, setAutoApplyRules] = useState<AutoApplyRuleType[]>([]);
	const [isActive, setIsActive] = useState(true);

	// Validation errors
	const [errors, setErrors] = useState<Record<string, string>>({});

	// Reset form when dialog opens or fee changes
	useEffect(() => {
		if (open) {
			if (fee) {
				setName(fee.name);
				setDescription(fee.description || "");
				setAmountType(fee.amountType);
				setAmount(fee.amount);
				setIsTaxable(fee.isTaxable);
				setVatRate(fee.vatRate);
				setAutoApplyRules(fee.autoApplyRules?.map((r) => r.type) || []);
				setIsActive(fee.isActive);
			} else {
				// Default values for new fee
				setName("");
				setDescription("");
				setAmountType("FIXED");
				setAmount(0);
				setIsTaxable(true);
				setVatRate(20);
				setAutoApplyRules([]);
				setIsActive(true);
			}
			setErrors({});
		}
	}, [open, fee]);

	// Reset form when dialog closes to prevent state leakage (Story 23.3 fix)
	useEffect(() => {
		if (!open) {
			// Small delay to ensure backdrop is properly removed
			const timer = setTimeout(() => {
				setName("");
				setDescription("");
				setAmountType("FIXED");
				setAmount(0);
				setIsTaxable(true);
				setVatRate(20);
				setAutoApplyRules([]);
				setIsActive(true);
				setErrors({});
			}, 100);
			
			return () => clearTimeout(timer);
		}
	}, [open]);

	const validate = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (!name.trim()) {
			newErrors.name = "Name is required";
		} else if (name.length > 100) {
			newErrors.name = "Name too long (max 100 characters)";
		}

		if (amount <= 0) {
			newErrors.amount = "Amount must be positive";
		}

		if (isTaxable && (vatRate < 0 || vatRate > 100)) {
			newErrors.vatRate = "VAT rate must be between 0 and 100";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validate()) return;

		const rules: AutoApplyRule[] | null =
			autoApplyRules.length > 0
				? autoApplyRules.map((type) => ({ type }))
				: null;

		const data: CreateOptionalFeeRequest = {
			name: name.trim(),
			description: description.trim() || null,
			amountType,
			amount,
			isTaxable,
			vatRate: isTaxable ? vatRate : 20,
			autoApplyRules: rules,
			isActive,
		};

		await onSubmit(data);
	};

	const toggleAutoApplyRule = (ruleType: AutoApplyRuleType) => {
		setAutoApplyRules((prev) =>
			prev.includes(ruleType)
				? prev.filter((r) => r !== ruleType)
				: [...prev, ruleType]
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]" data-testid="fee-dialog">
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
						{/* Name */}
						<div className="grid gap-2">
							<Label htmlFor="name">{t("form.name")} *</Label>
							<Input
								id="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder={t("form.namePlaceholder")}
								data-testid="name-input"
							/>
							{errors.name && (
								<p className="text-sm text-destructive">{errors.name}</p>
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

						{/* Amount Type and Amount */}
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="amountType">{t("form.amountType")} *</Label>
								<Select
									value={amountType}
									onValueChange={(value) => setAmountType(value as AmountType)}
								>
									<SelectTrigger data-testid="amount-type-select">
										<SelectValue placeholder={t("form.amountTypePlaceholder")} />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="FIXED">{t("types.FIXED")}</SelectItem>
										<SelectItem value="PERCENTAGE">{t("types.PERCENTAGE")}</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="amount">
									{t("form.amount")} {amountType === "FIXED" ? "(€)" : "(%)"} *
								</Label>
								<Input
									id="amount"
									type="number"
									min={0}
									step={amountType === "FIXED" ? 0.01 : 1}
									value={amount}
									onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
									data-testid="amount-input"
								/>
								{errors.amount && (
									<p className="text-sm text-destructive">{errors.amount}</p>
								)}
							</div>
						</div>
						<p className="text-xs text-muted-foreground">{t("form.amountHelp")}</p>

						{/* Taxable Toggle */}
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label htmlFor="isTaxable">{t("form.isTaxable")}</Label>
								<p className="text-xs text-muted-foreground">
									{t("form.isTaxableHelp")}
								</p>
							</div>
							<Switch
								id="isTaxable"
								checked={isTaxable}
								onCheckedChange={setIsTaxable}
								data-testid="is-taxable-toggle"
							/>
						</div>

						{/* VAT Rate (conditional) */}
						{isTaxable && (
							<div className="grid gap-2">
								<Label htmlFor="vatRate">{t("form.vatRate")}</Label>
								<Input
									id="vatRate"
									type="number"
									min={0}
									max={100}
									step={0.1}
									value={vatRate}
									onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
									data-testid="vat-rate-input"
								/>
								<p className="text-xs text-muted-foreground">{t("form.vatRateHelp")}</p>
								{errors.vatRate && (
									<p className="text-sm text-destructive">{errors.vatRate}</p>
								)}
							</div>
						)}

						{/* Auto-Apply Rules */}
						<div className="grid gap-2">
							<Label>{t("form.autoApplyRules")}</Label>
							<div className="flex flex-wrap gap-2">
								{AUTO_APPLY_RULE_TYPES.map((ruleType) => (
									<Button
										key={ruleType}
										type="button"
										variant={autoApplyRules.includes(ruleType) ? "default" : "outline"}
										size="sm"
										onClick={() => toggleAutoApplyRule(ruleType)}
										className="text-xs"
									>
										{t(`autoApplyTypes.${ruleType}`)}
									</Button>
								))}
							</div>
							<p className="text-xs text-muted-foreground">{t("form.autoApplyRulesHelp")}</p>
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
