import { OrdersListClient } from "@saas/orders/components/OrdersListClient";
import { db } from "@repo/database";
import { getTranslations } from "next-intl/server";


interface OrdersListPageProps {
	params: Promise<{
		organizationSlug: string;
	}>;
}

export async function generateMetadata() {
	const t = await getTranslations();

	return {
		title: t("orders.list.title"),
	};
}

async function getOrders(organizationSlug: string) {
	const organization = await db.organization.findFirst({
		where: { slug: organizationSlug },
		select: { id: true },
	});

	if (!organization) {
		return [];
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const orders = await (db as any).order.findMany({
		where: { organizationId: organization.id },
		orderBy: { createdAt: "desc" },
		take: 50,
		include: {
			contact: {
				select: {
					id: true,
					displayName: true,
				},
			},
		},
	});

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return orders.map((order) => ({
		id: order.id,
		reference: order.reference,
		status: order.status,
		createdAt: order.createdAt.toISOString(),
		contact: order.contact,
	}));
}

export default async function OrdersListPage({ params }: OrdersListPageProps) {
	const { organizationSlug } = await params;

	const orders = await getOrders(organizationSlug);

	return <OrdersListClient orders={orders} />;
}
