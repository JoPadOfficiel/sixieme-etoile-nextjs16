"use client";

import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/components/tabs";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@ui/components/table";
import { Skeleton } from "@ui/components/skeleton";
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
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@shared/lib/api-client";
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
	CONFIRMED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
	INVOICED: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
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
	const { data: quotesData, isLoading, refetch } = useQuery({
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
		}))
	);

	// Filter lines that can have manual spawn (MANUAL type or dispatchable=false, and no mission)
	const canSpawnManually = (line: QuoteLine) => {
		const hasMission = line.missions && line.missions.length > 0;
		return !hasMission && (line.type === "MANUAL" || !line.dispatchable);
	};

	// Get first mission ID if exists
	const getLinkedMissionId = (line: QuoteLine): string | null => {
		return line.missions && line.missions.length > 0 ? line.missions[0].id : null;
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
						<FileTextIcon className="h-12 w-12 text-muted-foreground mb-4" />
						<h3 className="text-lg font-medium mb-2">{t("tabs.commercialHeading")}</h3>
						<p className="text-sm text-muted-foreground max-w-md">
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
								<TableHead className="text-right">{t("commercial.price")}</TableHead>
								<TableHead>{t("commercial.mission")}</TableHead>
								<TableHead className="text-right">{t("commercial.actions")}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{allLines.map((line) => (
								<TableRow key={line.id}>
									<TableCell className="font-medium">{line.label}</TableCell>
									<TableCell>
										<Badge variant={line.type === "MANUAL" ? "secondary" : "outline"}>
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
												className="gap-1 p-0 h-auto"
												onClick={() => router.push(`/app/${organizationSlug}/dispatch?mission=${getLinkedMissionId(line)}`)}
											>
												<LinkIcon className="h-3 w-3" />
												{t("commercial.linked")}
											</Button>
										) : (
											<Badge variant="outline" className="text-muted-foreground">
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
							? new Date((selectedLine as QuoteLine & { pickupAt?: string }).pickupAt!)
							: undefined
					}
					defaultTime={
						(selectedLine as QuoteLine & { pickupAt?: string }).pickupAt
							? format(new Date((selectedLine as QuoteLine & { pickupAt?: string }).pickupAt!), "HH:mm")
							: undefined
					}
					defaultVehicleCategoryId={
						(selectedLine as QuoteLine & { vehicleCategoryId?: string | null }).vehicleCategoryId ?? undefined
					}
					onSuccess={handleSpawnSuccess}
				/>
			)}
		</>
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

	// Error state - order not found
	if (!order) {
		return (
			<div className="py-8">
				<div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
					<PackageIcon className="h-16 w-16 text-muted-foreground" />
					<h2 className="text-xl font-semibold">{t("detail.notFound")}</h2>
					<p className="text-muted-foreground">
						{t("detail.notFoundDescription")}
					</p>
					<Button
						variant="outline"
						onClick={() => router.push(`/app/${organizationSlug}/orders`)}
					>
						<ArrowLeftIcon className="h-4 w-4 mr-2" />
						{t("detail.backToList")}
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="py-8 space-y-6">
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
						<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
							{order.reference}
						</h1>
						<Badge className={STATUS_STYLES[order.status]}>
							{t(`status.${order.status.toLowerCase()}`)}
						</Badge>
					</div>
					<div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground ml-11">
						<div className="flex items-center gap-1.5">
							<UserIcon className="h-4 w-4" />
							<span>{order.contact.displayName}</span>
						</div>
						<div className="flex items-center gap-1.5">
							<CalendarIcon className="h-4 w-4" />
							<span>
								{t("detail.createdAt", { date: format(new Date(order.createdAt), "d MMMM yyyy", { locale: fr }) })}
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* KPI Cards */}
			<div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">{t("detail.kpi.quotes")}</CardTitle>
						<FileTextIcon className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{order._count.quotes}</div>
						<p className="text-xs text-muted-foreground">
							{t("detail.kpi.quotesLabel", { count: order._count.quotes })}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">{t("detail.kpi.missions")}</CardTitle>
						<TruckIcon className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{order._count.missions}</div>
						<p className="text-xs text-muted-foreground">
							{t("detail.kpi.missionsLabel", { count: order._count.missions })}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">{t("detail.kpi.invoices")}</CardTitle>
						<ReceiptIcon className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{order._count.invoices}</div>
						<p className="text-xs text-muted-foreground">
							{t("detail.kpi.invoicesLabel", { count: order._count.invoices })}
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Tabs Navigation */}
			<Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
				<TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
					<TabsTrigger value="commercial" className="gap-2">
						<FileTextIcon className="h-4 w-4 hidden sm:block" />
						{t("tabs.commercial")}
					</TabsTrigger>
					<TabsTrigger value="operations" className="gap-2">
						<TruckIcon className="h-4 w-4 hidden sm:block" />
						{t("tabs.operations")}
					</TabsTrigger>
					<TabsTrigger value="financial" className="gap-2">
						<ReceiptIcon className="h-4 w-4 hidden sm:block" />
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
								<TruckIcon className="h-12 w-12 text-muted-foreground mb-4" />
								<h3 className="text-lg font-medium mb-2">{t("tabs.operationsHeading")}</h3>
								<p className="text-sm text-muted-foreground max-w-md">
									{t("tabs.operationsPlaceholder")}
								</p>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				{/* Financial Tab */}
				<TabsContent value="financial" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<ReceiptIcon className="h-5 w-5" />
								{t("tabs.financialTitle")}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex flex-col items-center justify-center py-12 text-center">
								<ReceiptIcon className="h-12 w-12 text-muted-foreground mb-4" />
								<h3 className="text-lg font-medium mb-2">{t("tabs.financialHeading")}</h3>
								<p className="text-sm text-muted-foreground max-w-md">
									{t("tabs.financialPlaceholder")}
								</p>
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{/* Notes Section (if any) */}
			{order.notes && (
				<Card>
					<CardHeader>
						<CardTitle className="text-sm font-medium">{t("detail.notes")}</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground whitespace-pre-wrap">
							{order.notes}
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
