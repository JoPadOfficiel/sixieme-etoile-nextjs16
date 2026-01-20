"use client";

import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/components/tabs";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { apiClient } from "@shared/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import {
	ArrowLeftIcon,
	CalendarIcon,
	FileTextIcon,
	Loader2Icon,
	PackageIcon,
	ReceiptIcon,
	TruckIcon,
	UserIcon,
} from "lucide-react";
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// ============================================================================
// Types
// ============================================================================

interface OrderContact {
	id: string;
	name: string;
	email: string | null;
}

interface Order {
	id: string;
	reference: string;
	status: "DRAFT" | "QUOTED" | "CONFIRMED" | "INVOICED" | "PAID" | "CANCELLED";
	notes: string | null;
	createdAt: string;
	updatedAt: string;
	contact: OrderContact;
	quotes: Array<{ id: string }>;
	missions: Array<{ id: string }>;
	invoices: Array<{ id: string }>;
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

const STATUS_LABELS: Record<Order["status"], string> = {
	DRAFT: "Brouillon",
	QUOTED: "Devisé",
	CONFIRMED: "Confirmé",
	INVOICED: "Facturé",
	PAID: "Payé",
	CANCELLED: "Annulé",
};

// ============================================================================
// Main Component
// ============================================================================

export default function OrderDetailPage() {
	const router = useRouter();
	const params = useParams();
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const { isSessionSynced } = useActiveOrganization();

	const orderId = params.id as string;
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

	// Fetch order data
	const { data: order, isLoading, error } = useQuery({
		queryKey: ["order", orderId],
		queryFn: async () => {
			const response = await apiClient.vtc.orders[":id"].$get({
				param: { id: orderId },
			});
			if (!response.ok) {
				if (response.status === 404) {
					throw new Error("Order not found");
				}
				throw new Error("Failed to fetch order");
			}
			return response.json() as Promise<Order>;
		},
		enabled: isSessionSynced && !!orderId,
	});

	// Loading state
	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	// Error state
	if (error || !order) {
		return (
			<div className="py-8">
				<div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
					<PackageIcon className="h-16 w-16 text-muted-foreground" />
					<h2 className="text-xl font-semibold">Dossier non trouvé</h2>
					<p className="text-muted-foreground">
						Le dossier demandé n&apos;existe pas ou vous n&apos;avez pas les droits pour y accéder.
					</p>
					<Button
						variant="outline"
						onClick={() => router.push(`/app/${organizationSlug}/quotes`)}
					>
						<ArrowLeftIcon className="h-4 w-4 mr-2" />
						Retour aux devis
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
							onClick={() => router.push(`/app/${organizationSlug}/quotes`)}
							className="h-8 w-8"
						>
							<ArrowLeftIcon className="h-4 w-4" />
						</Button>
						<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
							{order.reference}
						</h1>
						<Badge className={STATUS_STYLES[order.status]}>
							{STATUS_LABELS[order.status]}
						</Badge>
					</div>
					<div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground ml-11">
						<div className="flex items-center gap-1.5">
							<UserIcon className="h-4 w-4" />
							<span>{order.contact.name}</span>
						</div>
						<div className="flex items-center gap-1.5">
							<CalendarIcon className="h-4 w-4" />
							<span>
								Créé le {format(new Date(order.createdAt), "d MMMM yyyy", { locale: fr })}
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* KPI Cards */}
			<div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Devis</CardTitle>
						<FileTextIcon className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{order.quotes.length}</div>
						<p className="text-xs text-muted-foreground">
							{order.quotes.length === 1 ? "devis associé" : "devis associés"}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Missions</CardTitle>
						<TruckIcon className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{order.missions.length}</div>
						<p className="text-xs text-muted-foreground">
							{order.missions.length === 1 ? "mission planifiée" : "missions planifiées"}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Factures</CardTitle>
						<ReceiptIcon className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{order.invoices.length}</div>
						<p className="text-xs text-muted-foreground">
							{order.invoices.length === 1 ? "facture émise" : "factures émises"}
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Tabs Navigation */}
			<Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
				<TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
					<TabsTrigger value="commercial" className="gap-2">
						<FileTextIcon className="h-4 w-4 hidden sm:block" />
						Commercial
					</TabsTrigger>
					<TabsTrigger value="operations" className="gap-2">
						<TruckIcon className="h-4 w-4 hidden sm:block" />
						Opérations
					</TabsTrigger>
					<TabsTrigger value="financial" className="gap-2">
						<ReceiptIcon className="h-4 w-4 hidden sm:block" />
						Financier
					</TabsTrigger>
				</TabsList>

				{/* Commercial Tab */}
				<TabsContent value="commercial" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<FileTextIcon className="h-5 w-5" />
								Informations Commerciales
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex flex-col items-center justify-center py-12 text-center">
								<FileTextIcon className="h-12 w-12 text-muted-foreground mb-4" />
								<h3 className="text-lg font-medium mb-2">Devis et détails commerciaux</h3>
								<p className="text-sm text-muted-foreground max-w-md">
									Les lignes de devis et les détails commerciaux apparaîtront ici.
									Cette section sera enrichie dans les prochaines versions.
								</p>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				{/* Operations Tab */}
				<TabsContent value="operations" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<TruckIcon className="h-5 w-5" />
								Suivi Opérationnel
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex flex-col items-center justify-center py-12 text-center">
								<TruckIcon className="h-12 w-12 text-muted-foreground mb-4" />
								<h3 className="text-lg font-medium mb-2">Missions et statuts opérationnels</h3>
								<p className="text-sm text-muted-foreground max-w-md">
									Les missions générées et leur statut d'exécution apparaîtront ici.
									Cette section sera enrichie dans les prochaines versions.
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
								Suivi Financier
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex flex-col items-center justify-center py-12 text-center">
								<ReceiptIcon className="h-12 w-12 text-muted-foreground mb-4" />
								<h3 className="text-lg font-medium mb-2">Factures et paiements</h3>
								<p className="text-sm text-muted-foreground max-w-md">
									Les factures et le suivi des paiements apparaîtront ici.
									Cette section sera enrichie dans les prochaines versions.
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
						<CardTitle className="text-sm font-medium">Notes</CardTitle>
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
