"use client";

import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import {
	PackageIcon,
	PlusIcon,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useTranslations } from "next-intl";

// ============================================================================
// Types
// ============================================================================

interface OrderListItem {
	id: string;
	reference: string;
	status: "DRAFT" | "QUOTED" | "CONFIRMED" | "INVOICED" | "PAID" | "CANCELLED";
	createdAt: string;
	contact: {
		id: string;
		displayName: string;
	};
}

interface OrdersListClientProps {
	orders: OrderListItem[];
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_STYLES: Record<OrderListItem["status"], string> = {
	DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
	QUOTED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
	CONFIRMED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
	INVOICED: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
	PAID: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
	CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

// ============================================================================
// Main Component
// ============================================================================

export function OrdersListClient({ orders }: OrdersListClientProps) {
	const router = useRouter();
	const params = useParams();
	const t = useTranslations("orders");
	const organizationSlug = params.organizationSlug as string;

	return (
		<div className="py-8 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">{t("list.heading")}</h1>
					<p className="text-muted-foreground mt-1">
						{t("list.description")}
					</p>
				</div>
				<Button disabled>
					<PlusIcon className="h-4 w-4 mr-2" />
					{t("list.newOrder")}
				</Button>
			</div>

			{orders.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<PackageIcon className="h-12 w-12 text-muted-foreground mb-4" />
						<h3 className="text-lg font-medium mb-2">{t("list.empty")}</h3>
						<p className="text-sm text-muted-foreground">
							{t("list.emptyDescription")}
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
										{t(`status.${order.status.toLowerCase()}`)}
									</Badge>
								</div>
							</CardHeader>
							<CardContent>
								<div className="flex items-center justify-between text-sm text-muted-foreground">
									<span>{order.contact.displayName}</span>
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
