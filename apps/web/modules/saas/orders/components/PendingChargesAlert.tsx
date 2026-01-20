"use client";

/**
 * Pending Charges Alert Component
 * Story 28.12: Post-Mission Pending Charges
 *
 * Displays detected pending charges from Mission.executionData
 * and allows adding them to an invoice with one click.
 */

import { apiClient } from "@shared/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@ui/components/alert";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Skeleton } from "@ui/components/skeleton";
import { AlertTriangle, Plus, Receipt } from "lucide-react";
import { useTranslations } from "next-intl";

// ============================================================================
// Types
// ============================================================================

interface PendingCharge {
	id: string;
	orderId: string;
	missionId: string;
	missionLabel: string;
	type: "WAITING_TIME" | "EXTRA_KM" | "PARKING" | "ADDITIONAL_TOLLS" | "OTHER";
	description: string;
	amount: number;
	vatRate: number;
	invoiced: boolean;
}

interface PendingChargesResult {
	orderId: string;
	pendingCharges: PendingCharge[];
	totalPending: number;
}

interface PendingChargesAlertProps {
	orderId: string;
	invoiceId?: string; // Target invoice for adding charges
	onChargeAdded?: () => void; // Callback after adding a charge
}

// ============================================================================
// Component
// ============================================================================

export function PendingChargesAlert({
	orderId,
	invoiceId,
	onChargeAdded,
}: PendingChargesAlertProps) {
	const t = useTranslations("orders.pendingCharges");
	const queryClient = useQueryClient();

	// Fetch pending charges
	const { data, isLoading, error, refetch } = useQuery({
		queryKey: ["orders", orderId, "pending-charges"],
		queryFn: async (): Promise<PendingChargesResult> => {
			const response = await apiClient.vtc.orders[":id"][
				"pending-charges"
			].$get({
				param: { id: orderId },
			});
			if (!response.ok) {
				throw new Error("Failed to fetch pending charges");
			}
			return response.json() as Promise<PendingChargesResult>;
		},
		refetchOnWindowFocus: false,
	});

	// Add single charge mutation
	const addChargeMutation = useMutation({
		mutationFn: async (charge: PendingCharge) => {
			if (!invoiceId) {
				throw new Error("No invoice selected");
			}
			const response = await apiClient.vtc.orders[":id"]["pending-charges"][
				"add"
			].$post({
				param: { id: orderId },
				json: { charge, invoiceId },
			});
			if (!response.ok) {
				throw new Error("Failed to add charge");
			}
			return response.json();
		},
		onSuccess: () => {
			refetch();
			queryClient.invalidateQueries({ queryKey: ["orderInvoices", orderId] });
			queryClient.invalidateQueries({ queryKey: ["invoices"] });
			onChargeAdded?.();
		},
	});

	// Add all charges mutation
	const addAllMutation = useMutation({
		mutationFn: async () => {
			if (!invoiceId) {
				throw new Error("No invoice selected");
			}
			const response = await apiClient.vtc.orders[":id"]["pending-charges"][
				"add-all"
			].$post({
				param: { id: orderId },
				json: { invoiceId },
			});
			if (!response.ok) {
				throw new Error("Failed to add charges");
			}
			return response.json();
		},
		onSuccess: () => {
			refetch();
			queryClient.invalidateQueries({ queryKey: ["orderInvoices", orderId] });
			queryClient.invalidateQueries({ queryKey: ["invoices"] });
			onChargeAdded?.();
		},
	});

	// Loading state
	if (isLoading) {
		return (
			<div className="mb-4">
				<Skeleton className="h-24 w-full" />
			</div>
		);
	}

	// Error state - silent fail (don't show broken UI)
	if (error) {
		console.error("Failed to fetch pending charges:", error);
		return null;
	}

	// No pending charges
	if (!data?.pendingCharges?.length) {
		return null;
	}

	const formatCurrency = (amount: number) =>
		new Intl.NumberFormat("fr-FR", {
			style: "currency",
			currency: "EUR",
		}).format(amount);

	const isPending = addChargeMutation.isPending || addAllMutation.isPending;

	return (
		<Alert
			variant="default"
			className="mb-4 border-amber-500/50 bg-amber-500/10"
		>
			<AlertTriangle className="h-4 w-4 text-amber-600" />
			<AlertTitle className="flex items-center gap-2">
				{t("title")}
				<Badge
					variant="outline"
					className="border-amber-500 bg-amber-500/20 text-amber-700"
				>
					{data.pendingCharges.length}
				</Badge>
			</AlertTitle>
			<AlertDescription>
				<p className="mb-3 text-muted-foreground text-sm">
					{t("description", { total: formatCurrency(data.totalPending) })}
				</p>

				<div className="space-y-2">
					{data.pendingCharges.map((charge) => (
						<div
							key={charge.id}
							className="flex items-center justify-between rounded-md bg-background/50 p-2"
						>
							<div>
								<p className="font-medium">{charge.description}</p>
								<p className="text-muted-foreground text-xs">
									{charge.missionLabel}
								</p>
							</div>
							<div className="flex items-center gap-2">
								<span className="font-medium text-amber-700">
									{formatCurrency(charge.amount)}
								</span>
								{invoiceId && (
									<Button
										size="sm"
										variant="outline"
										onClick={() => addChargeMutation.mutate(charge)}
										disabled={isPending}
										className="gap-1"
									>
										<Plus className="h-3 w-3" />
										{t("addToInvoice")}
									</Button>
								)}
							</div>
						</div>
					))}
				</div>

				{invoiceId && data.pendingCharges.length > 1 && (
					<Button
						className="mt-3 w-full gap-2"
						variant="secondary"
						onClick={() => addAllMutation.mutate()}
						disabled={isPending}
					>
						<Receipt className="h-4 w-4" />
						{t("addAllToInvoice")}
					</Button>
				)}

				{!invoiceId && (
					<p className="mt-3 text-muted-foreground text-xs italic">
						{t("noInvoiceSelected")}
					</p>
				)}
			</AlertDescription>
		</Alert>
	);
}
