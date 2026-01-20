"use client";

import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { apiClient } from "@shared/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import {
	Loader2Icon,
	PackageIcon,
	PlusIcon,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface OrderListItem {
	id: string;
	reference: string;
	status: "DRAFT" | "QUOTED" | "CONFIRMED" | "INVOICED" | "PAID" | "CANCELLED";
	createdAt: string;
	contact: {
		id: string;
		name: string;
	};
}

interface OrdersResponse {
	orders: OrderListItem[];
	total: number;
	page: number;
	limit: number;
}

const STATUS_STYLES: Record<OrderListItem["status"], string> = {
	DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
	QUOTED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
	CONFIRMED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
	INVOICED: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
	PAID: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
	CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const STATUS_LABELS: Record<OrderListItem["status"], string> = {
	DRAFT: "Brouillon",
	QUOTED: "Devisé",
	CONFIRMED: "Confirmé",
	INVOICED: "Facturé",
	PAID: "Payé",
	CANCELLED: "Annulé",
};

export default function OrdersListPage() {
	const router = useRouter();
	const params = useParams();
	const { isSessionSynced } = useActiveOrganization();
	const organizationSlug = params.organizationSlug as string;

	const { data, isLoading } = useQuery({
		queryKey: ["orders"],
		queryFn: async () => {
			const response = await apiClient.vtc.orders.$get({
				query: { limit: "50" },
			});
			if (!response.ok) throw new Error("Failed to fetch orders");
			return response.json() as Promise<OrdersResponse>;
		},
		enabled: isSessionSynced,
	});

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const orders = data?.orders ?? [];

	return (
		<div className="py-8 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Dossiers</h1>
					<p className="text-muted-foreground mt-1">
						Gérez vos dossiers de commande
					</p>
				</div>
				<Button disabled>
					<PlusIcon className="h-4 w-4 mr-2" />
					Nouveau dossier
				</Button>
			</div>

			{orders.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<PackageIcon className="h-12 w-12 text-muted-foreground mb-4" />
						<h3 className="text-lg font-medium mb-2">Aucun dossier</h3>
						<p className="text-sm text-muted-foreground">
							Les dossiers apparaîtront ici une fois créés.
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4">
					{orders.map((order) => (
						<Card
							key={order.id}
							className="cursor-pointer hover:bg-muted/50 transition-colors"
							onClick={() => router.push(`/app/${organizationSlug}/orders/${order.id}`)}
						>
							<CardHeader className="pb-2">
								<div className="flex items-center justify-between">
									<CardTitle className="text-lg">{order.reference}</CardTitle>
									<Badge className={STATUS_STYLES[order.status]}>
										{STATUS_LABELS[order.status]}
									</Badge>
								</div>
							</CardHeader>
							<CardContent>
								<div className="flex items-center justify-between text-sm text-muted-foreground">
									<span>{order.contact.name}</span>
									<span>
										{format(new Date(order.createdAt), "d MMM yyyy", { locale: fr })}
									</span>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
