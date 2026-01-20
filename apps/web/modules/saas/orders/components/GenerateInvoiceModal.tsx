"use client";

import { apiClient } from "@shared/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/components/tabs";
import { useToast } from "@ui/hooks/use-toast";
import {
	AlertCircleIcon,
	Loader2Icon,
	PercentIcon,
	ReceiptIcon,
	WalletIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

/**
 * Story 28.11: Partial Invoicing
 * Modal for generating partial invoices from an Order
 * Supports three modes: Full Balance, Deposit %, Manual Selection
 */

// ============================================================================
// Types
// ============================================================================

interface QuoteLine {
	id: string;
	label: string;
	type: string;
	totalPrice: string | number;
	vatRate?: number;
}

interface GenerateInvoiceModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	orderId: string;
	orderReference: string;
	quoteLines: QuoteLine[];
	onSuccess?: () => void;
}

type InvoiceMode = "FULL_BALANCE" | "DEPOSIT_PERCENT" | "MANUAL_SELECTION";

interface OrderBalance {
	totalAmount: number;
	invoicedAmount: number;
	remainingBalance: number;
	invoiceCount: number;
}

// ============================================================================
// Component
// ============================================================================

export function GenerateInvoiceModal({
	open,
	onOpenChange,
	orderId,
	orderReference,
	quoteLines,
	onSuccess,
}: GenerateInvoiceModalProps) {
	const t = useTranslations();
	const { toast } = useToast();
	const queryClient = useQueryClient();

	// Form state
	const [mode, setMode] = useState<InvoiceMode>("FULL_BALANCE");
	const [depositPercent, setDepositPercent] = useState<number>(30);
	const [selectedLineIds, setSelectedLineIds] = useState<string[]>([]);

	// Fetch order balance
	const { data: balance, isLoading: isLoadingBalance } = useQuery<OrderBalance>(
		{
			queryKey: ["orderBalance", orderId],
			queryFn: async () => {
				const response = await apiClient.vtc.invoices.order[
					":orderId"
				].balance.$get({
					param: { orderId },
				});
				if (!response.ok) {
					throw new Error("Failed to fetch order balance");
				}
				return response.json() as Promise<OrderBalance>;
			},
			enabled: open,
		},
	);

	// Calculate invoice amount based on mode
	const calculatedAmount = useMemo(() => {
		if (!balance) return 0;

		switch (mode) {
			case "FULL_BALANCE":
				return balance.remainingBalance;

			case "DEPOSIT_PERCENT": {
				const percent = Math.min(100, Math.max(1, depositPercent));
				return Math.round(((balance.totalAmount * percent) / 100) * 100) / 100;
			}

			case "MANUAL_SELECTION": {
				const selectedTotal = quoteLines
					.filter((line) => selectedLineIds.includes(line.id))
					.reduce((sum, line) => sum + Number(line.totalPrice), 0);
				// Add estimated VAT (10%)
				return Math.round(selectedTotal * 1.1 * 100) / 100;
			}

			default:
				return 0;
		}
	}, [mode, balance, depositPercent, selectedLineIds, quoteLines]);

	// Check if amount exceeds remaining balance
	const exceedsBalance = balance
		? calculatedAmount > balance.remainingBalance
		: false;

	// Toggle line selection
	const toggleLineSelection = (lineId: string) => {
		setSelectedLineIds((prev) =>
			prev.includes(lineId)
				? prev.filter((id) => id !== lineId)
				: [...prev, lineId],
		);
	};

	// Create partial invoice mutation
	const createInvoiceMutation = useMutation({
		mutationFn: async () => {
			const response = await apiClient.vtc.invoices.partial.$post({
				json: {
					orderId,
					mode,
					depositPercent:
						mode === "DEPOSIT_PERCENT" ? depositPercent : undefined,
					selectedLineIds:
						mode === "MANUAL_SELECTION" ? selectedLineIds : undefined,
				},
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					(errorData as { message?: string }).message ||
						"Failed to create invoice",
				);
			}

			return response.json();
		},
		onSuccess: () => {
			toast({
				title: t("orders.invoice.successTitle"),
				description: t("orders.invoice.successDescription"),
			});

			// Invalidate queries to refresh data
			queryClient.invalidateQueries({ queryKey: ["order", orderId] });
			queryClient.invalidateQueries({ queryKey: ["orderBalance", orderId] });
			queryClient.invalidateQueries({ queryKey: ["invoices"] });

			onOpenChange(false);
			onSuccess?.();
		},
		onError: (error) => {
			toast({
				title: t("orders.invoice.errorTitle"),
				description:
					error instanceof Error
						? error.message
						: t("orders.invoice.errorDescription"),
				variant: "destructive",
			});
		},
	});

	// Validate form
	const isFormValid = useMemo(() => {
		if (!balance || balance.remainingBalance <= 0) return false;
		if (exceedsBalance) return false;
		if (calculatedAmount <= 0) return false;

		if (mode === "MANUAL_SELECTION" && selectedLineIds.length === 0) {
			return false;
		}

		return true;
	}, [balance, exceedsBalance, calculatedAmount, mode, selectedLineIds]);

	// Format currency
	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("fr-FR", {
			style: "currency",
			currency: "EUR",
		}).format(amount);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<ReceiptIcon className="h-5 w-5" />
						{t("orders.invoice.generateTitle")}
					</DialogTitle>
					<DialogDescription>
						{t("orders.invoice.generateDescription", {
							reference: orderReference,
						})}
					</DialogDescription>
				</DialogHeader>

				{/* Balance Summary */}
				<div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4">
					<div>
						<p className="text-muted-foreground text-sm">
							{t("orders.invoice.orderTotal")}
						</p>
						<p className="font-bold text-2xl">
							{isLoadingBalance
								? "..."
								: formatCurrency(balance?.totalAmount ?? 0)}
						</p>
					</div>
					<div>
						<p className="text-muted-foreground text-sm">
							{t("orders.invoice.remainingBalance")}
						</p>
						<p className="font-bold text-2xl text-green-600">
							{isLoadingBalance
								? "..."
								: formatCurrency(balance?.remainingBalance ?? 0)}
						</p>
						{balance && balance.invoiceCount > 0 && (
							<p className="text-muted-foreground text-xs">
								{t("orders.invoice.existingInvoices", {
									count: balance.invoiceCount,
								})}
							</p>
						)}
					</div>
				</div>

				{/* No balance remaining */}
				{balance && balance.remainingBalance <= 0 && (
					<div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-destructive">
						<AlertCircleIcon className="h-5 w-5" />
						<p className="text-sm">{t("orders.invoice.noBalance")}</p>
					</div>
				)}

				{/* Mode Tabs */}
				{balance && balance.remainingBalance > 0 && (
					<Tabs
						value={mode}
						onValueChange={(v) => setMode(v as InvoiceMode)}
						className="w-full"
					>
						<TabsList className="grid w-full grid-cols-3">
							<TabsTrigger value="FULL_BALANCE" className="gap-1">
								<WalletIcon className="h-4 w-4" />
								<span className="hidden sm:inline">
									{t("orders.invoice.modeFullBalance")}
								</span>
							</TabsTrigger>
							<TabsTrigger value="DEPOSIT_PERCENT" className="gap-1">
								<PercentIcon className="h-4 w-4" />
								<span className="hidden sm:inline">
									{t("orders.invoice.modeDeposit")}
								</span>
							</TabsTrigger>
							<TabsTrigger value="MANUAL_SELECTION" className="gap-1">
								<ReceiptIcon className="h-4 w-4" />
								<span className="hidden sm:inline">
									{t("orders.invoice.modeManual")}
								</span>
							</TabsTrigger>
						</TabsList>

						{/* Full Balance Tab */}
						<TabsContent value="FULL_BALANCE" className="mt-4 space-y-4">
							<p className="text-muted-foreground text-sm">
								{t("orders.invoice.fullBalanceDescription")}
							</p>
							<div className="rounded-lg border p-4 text-center">
								<p className="font-bold text-3xl">
									{formatCurrency(balance.remainingBalance)}
								</p>
								<p className="text-muted-foreground text-sm">
									{t("orders.invoice.invoiceAmount")}
								</p>
							</div>
						</TabsContent>

						{/* Deposit Tab */}
						<TabsContent value="DEPOSIT_PERCENT" className="mt-4 space-y-4">
							<div className="flex items-center gap-4">
								<Label htmlFor="depositPercent" className="whitespace-nowrap">
									{t("orders.invoice.depositLabel")}
								</Label>
								<Input
									id="depositPercent"
									type="number"
									min={1}
									max={100}
									value={depositPercent}
									onChange={(e) => setDepositPercent(Number(e.target.value))}
									className="w-24"
								/>
								<span>%</span>
							</div>
							<div className="rounded-lg border p-4 text-center">
								<p className="font-bold text-3xl">
									{formatCurrency(calculatedAmount)}
								</p>
								<p className="text-muted-foreground text-sm">
									{t("orders.invoice.depositOf", { percent: depositPercent })}
								</p>
							</div>
							{exceedsBalance && (
								<div className="flex items-center gap-2 text-destructive">
									<AlertCircleIcon className="h-4 w-4" />
									<p className="text-sm">
										{t("orders.invoice.exceedsBalance")}
									</p>
								</div>
							)}
						</TabsContent>

						{/* Manual Selection Tab */}
						<TabsContent value="MANUAL_SELECTION" className="mt-4 space-y-4">
							<p className="text-muted-foreground text-sm">
								{t("orders.invoice.manualDescription")}
							</p>
							<div className="max-h-[200px] space-y-2 overflow-y-auto rounded-lg border p-2">
								{quoteLines.length === 0 ? (
									<p className="py-4 text-center text-muted-foreground text-sm">
										{t("orders.invoice.noLines")}
									</p>
								) : (
									quoteLines.map((line) => (
										<label
											key={line.id}
											className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-muted/50"
										>
											<Checkbox
												checked={selectedLineIds.includes(line.id)}
												onCheckedChange={() => toggleLineSelection(line.id)}
											/>
											<span className="flex-1 text-sm">{line.label}</span>
											<span className="font-medium">
												{formatCurrency(Number(line.totalPrice))}
											</span>
										</label>
									))
								)}
							</div>
							<div className="rounded-lg border p-4 text-center">
								<p className="font-bold text-3xl">
									{formatCurrency(calculatedAmount)}
								</p>
								<p className="text-muted-foreground text-sm">
									{t("orders.invoice.linesSelected", {
										count: selectedLineIds.length,
									})}
								</p>
							</div>
							{exceedsBalance && (
								<div className="flex items-center gap-2 text-destructive">
									<AlertCircleIcon className="h-4 w-4" />
									<p className="text-sm">
										{t("orders.invoice.exceedsBalance")}
									</p>
								</div>
							)}
						</TabsContent>
					</Tabs>
				)}

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={createInvoiceMutation.isPending}
					>
						{t("common.cancel")}
					</Button>
					<Button
						onClick={() => createInvoiceMutation.mutate()}
						disabled={!isFormValid || createInvoiceMutation.isPending}
					>
						{createInvoiceMutation.isPending ? (
							<>
								<Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
								{t("orders.invoice.generating")}
							</>
						) : (
							<>
								<ReceiptIcon className="mr-2 h-4 w-4" />
								{t("orders.invoice.generate")}
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
