import { OrderDetailClient } from "@saas/orders/components/OrderDetailClient";
import { db } from "@repo/database";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";


interface OrderDetailPageProps {
	params: Promise<{
		organizationSlug: string;
		id: string;
	}>;
}

export async function generateMetadata({ params }: OrderDetailPageProps) {
	const { id } = await params;
	const t = await getTranslations();

	return {
		title: `${t("orders.detail.title")} - ${id.substring(0, 8)}`,
	};
}

async function getOrder(id: string, organizationSlug: string) {
	const organization = await db.organization.findFirst({
		where: { slug: organizationSlug },
		select: { id: true },
	});

	if (!organization) {
		return null;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const order = await (db as any).order.findFirst({
		where: {
			id,
			organizationId: organization.id,
		},
		include: {
			contact: {
				select: {
					id: true,
					displayName: true,
					email: true,
				},
			},
			_count: {
				select: {
					quotes: true,
					missions: true,
					invoices: true,
				},
			},
		},
	});

	if (!order) {
		return null;
	}

	return {
		id: order.id,
		reference: order.reference,
		status: order.status,
		notes: order.notes,
		createdAt: order.createdAt.toISOString(),
		updatedAt: order.updatedAt.toISOString(),
		contact: order.contact,
		_count: order._count,
	};
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
	const { id, organizationSlug } = await params;

	const order = await getOrder(id, organizationSlug);

	if (!order) {
		notFound();
	}

	return <OrderDetailClient order={order} />;
}
