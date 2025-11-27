"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Badge } from "@ui/components/badge";
import { Skeleton } from "@ui/components/skeleton";
import { Button } from "@ui/components/button";
import {
	FileText,
	Receipt,
	Clock,
	TrendingUp,
	ExternalLink,
	CheckCircle,
	Send,
	Eye,
	XCircle,
	AlertCircle,
} from "lucide-react";
import type {
	TimelineItem,
	TimelineSummary,
	ContactTimelineResponse,
} from "../types";

interface ContactTimelineProps {
	contactId: string;
}

/**
 * Format currency in EUR
 */
function formatCurrency(amount: number): string {
	return new Intl.NumberFormat("fr-FR", {
		style: "currency",
		currency: "EUR",
	}).format(amount);
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
	return new Date(dateStr).toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

/**
 * Get status badge variant and icon for quotes
 */
function getQuoteStatusBadge(status: string) {
	switch (status) {
		case "DRAFT":
			return { variant: "secondary" as const, icon: FileText };
		case "SENT":
			return { variant: "default" as const, icon: Send };
		case "VIEWED":
			return { variant: "default" as const, icon: Eye };
		case "ACCEPTED":
			return { variant: "default" as const, icon: CheckCircle };
		case "REJECTED":
			return { variant: "destructive" as const, icon: XCircle };
		case "EXPIRED":
			return { variant: "secondary" as const, icon: AlertCircle };
		default:
			return { variant: "secondary" as const, icon: FileText };
	}
}

/**
 * Get status badge variant for invoices
 */
function getInvoiceStatusBadge(status: string) {
	switch (status) {
		case "DRAFT":
			return { variant: "secondary" as const, icon: FileText };
		case "ISSUED":
			return { variant: "default" as const, icon: Send };
		case "PAID":
			return { variant: "default" as const, icon: CheckCircle };
		case "CANCELLED":
			return { variant: "destructive" as const, icon: XCircle };
		default:
			return { variant: "secondary" as const, icon: Receipt };
	}
}

/**
 * Timeline item component
 */
function TimelineItemCard({ item }: { item: TimelineItem }) {
	const t = useTranslations("contacts.timeline");
	const isQuote = item.type === "QUOTE";
	const statusBadge = isQuote
		? getQuoteStatusBadge(item.status)
		: getInvoiceStatusBadge(item.status);
	const StatusIcon = statusBadge.icon;

	return (
		<div className="flex gap-4 pb-4 border-b last:border-b-0 last:pb-0">
			{/* Icon */}
			<div
				className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
					isQuote
						? "bg-blue-100 dark:bg-blue-900"
						: "bg-green-100 dark:bg-green-900"
				}`}
			>
				{isQuote ? (
					<FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
				) : (
					<Receipt className="h-5 w-5 text-green-600 dark:text-green-400" />
				)}
			</div>

			{/* Content */}
			<div className="flex-1 min-w-0">
				<div className="flex items-start justify-between gap-2">
					<div>
						<div className="flex items-center gap-2 mb-1">
							<Badge variant={statusBadge.variant} className="gap-1">
								<StatusIcon className="h-3 w-3" />
								{item.status}
							</Badge>
							<span className="text-xs text-muted-foreground">
								{isQuote ? t("quote") : t("invoice")}
							</span>
						</div>
						<p className="text-sm font-medium truncate">{item.description}</p>
						<div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
							<Clock className="h-3 w-3" />
							{formatDate(item.date)}
							{item.metadata.vehicleCategory && (
								<span className="ml-2">• {item.metadata.vehicleCategory}</span>
							)}
						</div>
					</div>
					<div className="text-right flex-shrink-0">
						<p className="font-semibold">{formatCurrency(item.amount)}</p>
						{item.metadata.marginPercent !== null &&
							item.metadata.marginPercent !== undefined && (
								<p
									className={`text-xs ${
										item.metadata.marginPercent >= 20
											? "text-green-600"
											: item.metadata.marginPercent >= 0
												? "text-orange-600"
												: "text-red-600"
									}`}
								>
									{item.metadata.marginPercent.toFixed(1)}% margin
								</p>
							)}
					</div>
				</div>

				{/* Action link */}
				<div className="mt-2">
					<a
						href={
							isQuote
								? `/app/quotes/${item.id}`
								: `/app/invoices/${item.id}`
						}
					>
						<Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
							<ExternalLink className="h-3 w-3 mr-1" />
							{t("viewDetails")}
						</Button>
					</a>
				</div>
			</div>
		</div>
	);
}

/**
 * Summary stats component
 */
function TimelineSummaryCard({ summary }: { summary: TimelineSummary }) {
	const t = useTranslations("contacts.timeline");

	return (
		<div className="grid grid-cols-2 gap-4 mb-4">
			<Card>
				<CardContent className="pt-4">
					<div className="flex items-center gap-2">
						<FileText className="h-4 w-4 text-blue-500" />
						<span className="text-sm text-muted-foreground">{t("quotes")}</span>
					</div>
					<p className="text-2xl font-bold mt-1">{summary.totalQuotes}</p>
					<p className="text-xs text-muted-foreground">
						{summary.acceptedQuotes} {t("accepted")}
					</p>
					<p className="text-sm font-medium text-blue-600 mt-1">
						{formatCurrency(summary.quotesValue)}
					</p>
				</CardContent>
			</Card>
			<Card>
				<CardContent className="pt-4">
					<div className="flex items-center gap-2">
						<Receipt className="h-4 w-4 text-green-500" />
						<span className="text-sm text-muted-foreground">
							{t("invoices")}
						</span>
					</div>
					<p className="text-2xl font-bold mt-1">{summary.totalInvoices}</p>
					<p className="text-xs text-muted-foreground">
						{summary.paidInvoices} {t("paid")}
					</p>
					<p className="text-sm font-medium text-green-600 mt-1">
						{formatCurrency(summary.invoicesValue)}
					</p>
				</CardContent>
			</Card>
		</div>
	);
}

/**
 * Loading skeleton
 */
function TimelineSkeleton() {
	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 gap-4">
				<Skeleton className="h-24" />
				<Skeleton className="h-24" />
			</div>
			<Skeleton className="h-20" />
			<Skeleton className="h-20" />
			<Skeleton className="h-20" />
		</div>
	);
}

/**
 * Contact Timeline Component
 *
 * Displays a combined timeline of quotes and invoices for a contact
 */
export function ContactTimeline({ contactId }: ContactTimelineProps) {
	const t = useTranslations("contacts.timeline");
	const [data, setData] = useState<ContactTimelineResponse | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchTimeline = useCallback(async () => {
		if (!contactId) return;

		setIsLoading(true);
		setError(null);

		try {
			const response = await fetch(
				`/api/vtc/contacts/${contactId}/timeline?limit=20`
			);

			if (!response.ok) {
				throw new Error("Failed to fetch timeline");
			}

			const result = await response.json();
			setData(result);
		} catch (err) {
			console.error("Failed to fetch timeline:", err);
			setError(t("fetchError"));
		} finally {
			setIsLoading(false);
		}
	}, [contactId, t]);

	useEffect(() => {
		fetchTimeline();
	}, [fetchTimeline]);

	if (isLoading) {
		return <TimelineSkeleton />;
	}

	if (error) {
		return (
			<Card>
				<CardContent className="pt-6">
					<p className="text-sm text-destructive text-center">{error}</p>
					<Button
						variant="outline"
						size="sm"
						className="mt-2 mx-auto block"
						onClick={fetchTimeline}
					>
						{t("retry")}
					</Button>
				</CardContent>
			</Card>
		);
	}

	if (!data || data.timeline.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-lg flex items-center gap-2">
						<TrendingUp className="h-5 w-5" />
						{t("title")}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground text-center py-4">
						{t("noActivity")}
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			{/* Summary */}
			<TimelineSummaryCard summary={data.summary} />

			{/* Timeline */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg flex items-center gap-2">
						<TrendingUp className="h-5 w-5" />
						{t("recentActivity")}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{data.timeline.map((item) => (
						<TimelineItemCard key={`${item.type}-${item.id}`} item={item} />
					))}
				</CardContent>
			</Card>
		</div>
	);
}
