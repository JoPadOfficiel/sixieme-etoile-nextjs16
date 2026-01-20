"use client";

import { apiClient } from "@shared/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Skeleton } from "@ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@ui/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/components/tabs";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
	ArrowLeftIcon,
	CalendarIcon,
	FileTextIcon,
	LinkIcon,
	PackageIcon,
	ReceiptIcon,
	RocketIcon,
	TruckIcon,
	UserIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
	useParams,
	usePathname,
	useRouter,
	useSearchParams,
} from "next/navigation";
import { useState } from "react";
import { SpawnMissionModal } from "./SpawnMissionModal";

// ============================================================================
// Types
// ============================================================================

interface OrderContact {
	id: string;
	displayName: string;
	email: string | null;
}

// Story 28.7: Quote line type for Commercial tab
interface QuoteLine {
	id: string;
	label: string;
	type: "CALCULATED" | "MANUAL" | "GROUP";
	totalPrice: string;
	dispatchable: boolean;
	missions: Array<{ id: string; status: string }>;
	sourceData: unknown;
}

interface Quote {
	id: string;
	pickupAt: string;
	vehicleCategoryId: string | null;
	lines: QuoteLine[];
}

interface Order {
	id: string;
	reference: string;
	status: "DRAFT" | "QUOTED" | "CONFIRMED" | "INVOICED" | "PAID" | "CANCELLED";
	notes: string | null;
	createdAt: string;
	updatedAt: string;
	contact: OrderContact;
	_count: {
		quotes: number;
		missions: number;
		invoices: number;
	};
}

interface OrderDetailClientProps {
	order: Order | null;
}

// ============================================================================
// Constants
// ============================================================================

const VALID_TABS = ["commercial", "operations", "financial"] as const;
type TabValue = (typeof VALID_TABS)[number];

const STATUS_STYLES: Record<Order["status"], string> = {
	DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
	QUOTED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
	CONFIRMED:
		"bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
	INVOICED:
		"bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
	PAID: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
	CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

// ============================================================================
// Story 28.7: Commercial Tab Content with Manual Spawn
// ============================================================================

interface CommercialTabContentProps {
	orderId: string;
}

function CommercialTabContent({ orderId }: CommercialTabContentProps) {
	const t = useTranslations("orders");
	const router = useRouter();
	const params = useParams();
	const organizationSlug = params.organizationSlug as string;
	const [selectedLine, setSelectedLine] = useState<QuoteLine | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [modalKey, setModalKey] = useState(0);

	// Fetch quote lines for this order
	const {
		data: quotesData,
		isLoading,
		refetch,
	} = useQuery({
		queryKey: ["orderQuoteLines", orderId],
		queryFn: async () => {
			const response = await apiClient.vtc.orders[":id"].$get({
				param: { id: orderId },
			});
			if (!response.ok) {
				throw new Error("Failed to fetch order");
			}
			const data = await response.json();
			return data as { quotes?: Quote[] };
		},
	});

	const quotes = quotesData?.quotes ?? [];
	const allLines = quotes.flatMap((q) =>
		q.lines.map((line) => ({
			...line,
			quoteId: q.id,
			pickupAt: q.pickupAt,
			vehicleCategoryId: q.vehicleCategoryId,
		})),
	);

	// Filter lines that can have manual spawn (MANUAL type or dispatchable=false, and no mission)
	const canSpawnManually = (line: QuoteLine) => {
		const hasMission = line.missions && line.missions.length > 0;
		return !hasMission && (line.type === "MANUAL" || !line.dispatchable);
	};

	// Get first mission ID if exists
	const getLinkedMissionId = (line: QuoteLine): string | null => {
		return line.missions && line.missions.length > 0
			? line.missions[0].id
			: null;
	};

	const handleOpenSpawnModal = (line: QuoteLine) => {
		setSelectedLine(line);
		setModalKey((prev) => prev + 1); // Force modal reset
		setIsModalOpen(true);
	};

	const handleSpawnSuccess = () => {
		refetch();
		router.refresh(); // Refresh server data for KPI update
	};

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<FileTextIcon className="h-5 w-5" />
						{t("tabs.commercialTitle")}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						<Skeleton className="h-12 w-full" />
						<Skeleton className="h-12 w-full" />
						<Skeleton className="h-12 w-full" />
					</div>
				</CardContent>
			</Card>
		);
	}

	if (allLines.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<FileTextIcon className="h-5 w-5" />
						{t("tabs.commercialTitle")}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<FileTextIcon className="mb-4 h-12 w-12 text-muted-foreground" />
						<h3 className="mb-2 font-medium text-lg">
							{t("tabs.commercialHeading")}
						</h3>
						<p className="max-w-md text-muted-foreground text-sm">
							{t("tabs.commercialPlaceholder")}
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<FileTextIcon className="h-5 w-5" />
						{t("tabs.commercialTitle")}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{t("commercial.label")}</TableHead>
								<TableHead>{t("commercial.type")}</TableHead>
								<TableHead className="text-right">
									{t("commercial.price")}
								</TableHead>
								<TableHead>{t("commercial.mission")}</TableHead>
								<TableHead className="text-right">
									{t("commercial.actions")}
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{allLines.map((line) => (
								<TableRow key={line.id}>
									<TableCell className="font-medium">{line.label}</TableCell>
									<TableCell>
										<Badge
											variant={line.type === "MANUAL" ? "secondary" : "outline"}
										>
											{line.type}
										</Badge>
									</TableCell>
									<TableCell className="text-right">
										{Number(line.totalPrice).toFixed(2)}€
									</TableCell>
									<TableCell>
										{getLinkedMissionId(line) ? (
											<Button
												variant="link"
												size="sm"
												className="h-auto gap-1 p-0"
												onClick={() =>
													router.push(
														`/app/${organizationSlug}/dispatch?mission=${getLinkedMissionId(line)}`,
													)
												}
											>
												<LinkIcon className="h-3 w-3" />
												{t("commercial.linked")}
											</Button>
										) : (
											<Badge
												variant="outline"
												className="text-muted-foreground"
											>
												{t("commercial.unlinked")}
											</Badge>
										)}
									</TableCell>
									<TableCell className="text-right">
										{canSpawnManually(line) && (
											<Button
												size="sm"
												variant="outline"
												onClick={() => handleOpenSpawnModal(line)}
												className="gap-1"
											>
												<RocketIcon className="h-3 w-3" />
												{t("commercial.createMission")}
											</Button>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{/* Spawn Mission Modal */}
			{selectedLine && (
				<SpawnMissionModal
					key={`${selectedLine.id}-${modalKey}`}
					open={isModalOpen}
					onOpenChange={setIsModalOpen}
					quoteLine={selectedLine}
					orderId={orderId}
					defaultDate={
						(selectedLine as QuoteLine & { pickupAt?: string }).pickupAt
							? new Date(
									(selectedLine as QuoteLine & { pickupAt?: string }).pickupAt!,
								)
							: undefined
					}
					defaultTime={
						(selectedLine as QuoteLine & { pickupAt?: string }).pickupAt
							? format(
									new Date(
										(selectedLine as QuoteLine & { pickupAt?: string })
											.pickupAt!,
									),
									"HH:mm",
								)
							: undefined
					}
					defaultVehicleCategoryId={
						(selectedLine as QuoteLine & { vehicleCategoryId?: string | null })
							.vehicleCategoryId ?? undefined
					}
					onSuccess={handleSpawnSuccess}
				/>
			)}
		</>
	);
}

// ============================================================================
// Story 28.11: Financial Tab Content
// ============================================================================

import { GenerateInvoiceModal } from "./GenerateInvoiceModal";

interface FinancialTabContentProps {
	orderId: string;
	orderReference: string;
	quotes: Quote[];
}

function FinancialTabContent({
	orderId,
	orderReference,
	quotes,
}: FinancialTabContentProps) {
	const t = useTranslations("orders");
	const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
	const params = useParams();
	const organizationSlug = params.organizationSlug as string;

	// Fetch invoices
	const { data: invoicesData, refetch: refetchInvoices } = useQuery({
		queryKey: ["orderInvoices", orderId],
		queryFn: async () => {
			const response = await apiClient.vtc.invoices.$get({
				query: { orderId, limit: "100" },
			});
			if (!response.ok) throw new Error("Failed to fetch invoices");
			return response.json();
		},
	});

	const invoices = invoicesData?.data ?? [];

	// Fetch balance
	const { data: balance, refetch: refetchBalance } = useQuery({
		queryKey: ["orderBalance", orderId],
		queryFn: async () => {
			const response = await apiClient.vtc.invoices.order[
				":orderId"
			].balance.$get({
				param: { orderId },
			});
			if (!response.ok) throw new Error("Failed to fetch balance");
			return response.json();
		},
	});

	const handleInvoiceCreated = () => {
		refetchInvoices();
		refetchBalance();
	};

	// Flatten lines for modal selection
	// Note: QuoteLine in this file uses 'totalPrice' as string, handled by Number() in map
	const allLines = quotes.flatMap((q) =>
		q.lines.map((l) => ({
			id: l.id,
			label: l.label,
			type: l.type,
			totalPrice: l.totalPrice,
			vatRate: 10, // Default to 10% if not available in this view model
		})),
	);

	return (
		<div className="space-y-4">
			{/* Balance Summary Card */}
			<div className="grid gap-4 md:grid-cols-3">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							{t("invoice.orderTotal")}
						</CardTitle>
						<ReceiptIcon className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{balance
								? new Intl.NumberFormat("fr-FR", {
										style: "currency",
										currency: "EUR",
									}).format(balance.totalAmount)
								: "..."}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							{t("invoice.invoicedAmount")}
						</CardTitle>
						<ReceiptIcon className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{balance
								? new Intl.NumberFormat("fr-FR", {
										style: "currency",
										currency: "EUR",
									}).format(balance.invoicedAmount)
								: "..."}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							{t("invoice.remainingBalance")}
						</CardTitle>
						<ReceiptIcon className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div
							className={`font-bold text-2xl ${balance?.remainingBalance === 0 ? "text-muted-foreground" : "text-green-600"}`}
						>
							{balance
								? new Intl.NumberFormat("fr-FR", {
										style: "currency",
										currency: "EUR",
									}).format(balance.remainingBalance)
								: "..."}
						</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="flex items-center gap-2">
						<ReceiptIcon className="h-5 w-5" />
						{t("tabs.financialTitle")}
					</CardTitle>
					<Button onClick={() => setIsGenerateModalOpen(true)}>
						<ReceiptIcon className="mr-2 h-4 w-4" />
						{t("invoice.generate")}
					</Button>
				</CardHeader>
				<CardContent>
					{invoices.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<ReceiptIcon className="mb-4 h-12 w-12 text-muted-foreground" />
							<h3 className="mb-2 font-medium text-lg">
								{t("invoice.noInvoices")}
							</h3>
							<p className="max-w-md text-muted-foreground text-sm">
								{t("invoice.startByGenerating")}
							</p>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{t("invoice.number")}</TableHead>
									<TableHead>{t("invoice.date")}</TableHead>
									<TableHead>{t("invoice.status")}</TableHead>
									<TableHead className="text-right">
										{t("invoice.amount")}
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{invoices.map((invoice) => (
									<TableRow key={invoice.id}>
										<TableCell className="font-medium">
											{invoice.number}
										</TableCell>
										<TableCell>
											{format(new Date(invoice.issueDate), "dd/MM/yyyy")}
										</TableCell>
										<TableCell>
											<Badge variant="outline">{invoice.status}</Badge>
										</TableCell>
										<TableCell className="text-right font-medium">
											{new Intl.NumberFormat("fr-FR", {
												style: "currency",
												currency: "EUR",
											}).format(invoice.totalInclVat)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<GenerateInvoiceModal
				open={isGenerateModalOpen}
				onOpenChange={setIsGenerateModalOpen}
				orderId={orderId}
				orderReference={orderReference}
				quoteLines={allLines}
				onSuccess={handleInvoiceCreated}
			/>
		</div>
	);
}

// ============================================================================
// Main Component
// ============================================================================

export function OrderDetailClient({ order }: OrderDetailClientProps) {
	const router = useRouter();
	const params = useParams();
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const t = useTranslations("orders");

	const organizationSlug = params.organizationSlug as string;

	// Tab state from URL
	const tabParam = searchParams.get("tab");
	const currentTab: TabValue = VALID_TABS.includes(tabParam as TabValue)
		? (tabParam as TabValue)
		: "commercial";

	const handleTabChange = (value: string) => {
		const newParams = new URLSearchParams(searchParams.toString());
		newParams.set("tab", value);
		router.push(`${pathname}?${newParams.toString()}`);
	};

	// Fetch quotes needed for financial tab line selection
	const { data: quotesData } = useQuery({
		queryKey: ["orderQuoteLines", order?.id],
		queryFn: async () => {
			if (!order?.id) return { quotes: [] };
			const response = await apiClient.vtc.orders[":id"].$get({
				param: { id: order.id },
			});
			if (!response.ok) return { quotes: [] };
			return response.json();
		},
		enabled: !!order?.id,
	});

	const quotes = (quotesData as { quotes?: Quote[] })?.quotes ?? [];

	// Error state - order not found
	if (!order) {
		return (
			<div className="py-8">
				<div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
					<PackageIcon className="h-16 w-16 text-muted-foreground" />
					<h2 className="font-semibold text-xl">{t("detail.notFound")}</h2>
					<p className="text-muted-foreground">
						{t("detail.notFoundDescription")}
					</p>
					<Button
						variant="outline"
						onClick={() => router.push(`/app/${organizationSlug}/orders`)}
					>
						<ArrowLeftIcon className="mr-2 h-4 w-4" />
						{t("detail.backToList")}
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6 py-8">
			{/* Header Section */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="space-y-1">
					<div className="flex items-center gap-3">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => router.push(`/app/${organizationSlug}/orders`)}
							className="h-8 w-8"
						>
							<ArrowLeftIcon className="h-4 w-4" />
						</Button>
						<h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
							{order.reference}
						</h1>
						<Badge className={STATUS_STYLES[order.status]}>
							{t(`status.${order.status.toLowerCase()}`)}
						</Badge>
					</div>
					<div className="ml-11 flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
						<div className="flex items-center gap-1.5">
							<UserIcon className="h-4 w-4" />
							<span>{order.contact.displayName}</span>
						</div>
						<div className="flex items-center gap-1.5">
							<CalendarIcon className="h-4 w-4" />
							<span>
								{t("detail.createdAt", {
									date: format(new Date(order.createdAt), "d MMMM yyyy", {
										locale: fr,
									}),
								})}
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* KPI Cards */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							{t("detail.kpi.quotes")}
						</CardTitle>
						<FileTextIcon className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">{order._count.quotes}</div>
						<p className="text-muted-foreground text-xs">
							{t("detail.kpi.quotesLabel", { count: order._count.quotes })}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							{t("detail.kpi.missions")}
						</CardTitle>
						<TruckIcon className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">{order._count.missions}</div>
						<p className="text-muted-foreground text-xs">
							{t("detail.kpi.missionsLabel", { count: order._count.missions })}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							{t("detail.kpi.invoices")}
						</CardTitle>
						<ReceiptIcon className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">{order._count.invoices}</div>
						<p className="text-muted-foreground text-xs">
							{t("detail.kpi.invoicesLabel", { count: order._count.invoices })}
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Tabs Navigation */}
			<Tabs
				value={currentTab}
				onValueChange={handleTabChange}
				className="space-y-4"
			>
				<TabsList className="grid w-full grid-cols-3 lg:inline-grid lg:w-auto">
					<TabsTrigger value="commercial" className="gap-2">
						<FileTextIcon className="hidden h-4 w-4 sm:block" />
						{t("tabs.commercial")}
					</TabsTrigger>
					<TabsTrigger value="operations" className="gap-2">
						<TruckIcon className="hidden h-4 w-4 sm:block" />
						{t("tabs.operations")}
					</TabsTrigger>
					<TabsTrigger value="financial" className="gap-2">
						<ReceiptIcon className="hidden h-4 w-4 sm:block" />
						{t("tabs.financial")}
					</TabsTrigger>
				</TabsList>

				{/* Commercial Tab - Story 28.7: Quote Lines with Manual Spawn */}
				<TabsContent value="commercial" className="space-y-4">
					<CommercialTabContent orderId={order.id} />
				</TabsContent>

				{/* Operations Tab */}
				<TabsContent value="operations" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<TruckIcon className="h-5 w-5" />
								{t("tabs.operationsTitle")}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex flex-col items-center justify-center py-12 text-center">
								<TruckIcon className="mb-4 h-12 w-12 text-muted-foreground" />
								<h3 className="mb-2 font-medium text-lg">
									{t("tabs.operationsHeading")}
								</h3>
								<p className="max-w-md text-muted-foreground text-sm">
									{t("tabs.operationsPlaceholder")}
								</p>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				{/* Financial Tab */}
				<TabsContent value="financial" className="space-y-4">
					<FinancialTabContent
						orderId={order.id}
						orderReference={order.reference}
						quotes={quotes}
					/>
				</TabsContent>
			</Tabs>

			{/* Notes Section (if any) */}
			{order.notes && (
				<Card>
					<CardHeader>
						<CardTitle className="font-medium text-sm">
							{t("detail.notes")}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="whitespace-pre-wrap text-muted-foreground text-sm">
							{order.notes}
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
