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
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
	CalendarIcon,
	LinkIcon,
	PlusIcon,
	TruckIcon,
	WrenchIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { InternalMissionModal } from "./InternalMissionModal";

/**
 * Story 28.13: Operations Tab Content
 * Displays missions for an order and allows creating internal tasks
 */

interface OperationsTabContentProps {
	orderId: string;
}

interface Mission {
	id: string;
	status: string;
	startAt: string;
	endAt: string | null;
	isInternal: boolean;
	notes: string | null;
	quoteLineId: string | null;
	driverId: string | null;
	vehicleId: string | null;
	sourceData: {
		label?: string;
		lineLabel?: string;
		pickupAddress?: string;
		dropoffAddress?: string;
		vehicleCategoryName?: string;
		isInternal?: boolean;
	} | null;
	driver?: {
		firstName: string;
		lastName: string;
	} | null;
	vehicle?: {
		internalName: string | null;
		registrationNumber: string;
	} | null;
}

const STATUS_STYLES: Record<string, string> = {
	PENDING:
		"bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
	ASSIGNED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
	IN_PROGRESS:
		"bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
	COMPLETED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
	CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export function OperationsTabContent({ orderId }: OperationsTabContentProps) {
	const t = useTranslations("orders");
	const router = useRouter();
	const params = useParams();
	const organizationSlug = params.organizationSlug as string;
	const [isModalOpen, setIsModalOpen] = useState(false);

	// Fetch missions for this order
	const {
		data: missionsData,
		isLoading,
		refetch,
	} = useQuery({
		queryKey: ["orderMissions", orderId],
		queryFn: async () => {
			// Fetch order with missions included
			const response = await apiClient.vtc.orders[":id"].$get({
				param: { id: orderId },
			});
			if (!response.ok) {
				throw new Error("Failed to fetch order missions");
			}
			const data = await response.json();
			return data as { missions?: Mission[] };
		},
	});

	const missions = missionsData?.missions ?? [];

	// Get label for mission (from sourceData or quoteLine)
	const getMissionLabel = (mission: Mission): string => {
		if (mission.isInternal && mission.sourceData?.label) {
			return mission.sourceData.label;
		}
		if (mission.sourceData?.lineLabel) {
			return mission.sourceData.lineLabel;
		}
		if (
			mission.sourceData?.pickupAddress &&
			mission.sourceData?.dropoffAddress
		) {
			return `${mission.sourceData.pickupAddress.split(",")[0]} → ${mission.sourceData.dropoffAddress.split(",")[0]}`;
		}
		return t("operations.unknownMission");
	};

	const handleMissionCreated = () => {
		refetch();
		router.refresh();
	};

	if (isLoading) {
		return (
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="flex items-center gap-2">
						<TruckIcon className="h-5 w-5" />
						{t("tabs.operationsTitle")}
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

	return (
		<>
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="flex items-center gap-2">
						<TruckIcon className="h-5 w-5" />
						{t("tabs.operationsTitle")}
					</CardTitle>
					{/* Story 28.13: Add Internal Task Button */}
					<Button onClick={() => setIsModalOpen(true)}>
						<PlusIcon className="mr-2 h-4 w-4" />
						{t("operations.addInternalTask")}
					</Button>
				</CardHeader>
				<CardContent>
					{missions.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<TruckIcon className="mb-4 h-12 w-12 text-muted-foreground" />
							<h3 className="mb-2 font-medium text-lg">
								{t("operations.noMissions")}
							</h3>
							<p className="max-w-md text-muted-foreground text-sm">
								{t("operations.noMissionsDescription")}
							</p>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{t("operations.label")}</TableHead>
									<TableHead>{t("operations.dateTime")}</TableHead>
									<TableHead>{t("operations.status")}</TableHead>
									<TableHead>{t("operations.assignment")}</TableHead>
									<TableHead className="text-right">
										{t("operations.actions")}
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{missions.map((mission) => (
									<TableRow key={mission.id}>
										<TableCell>
											<div className="flex items-center gap-2">
												{/* Story 28.13: Internal badge */}
												{mission.isInternal && (
													<Badge
														variant="secondary"
														className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
													>
														<WrenchIcon className="mr-1 h-3 w-3" />
														{t("operations.internalBadge")}
													</Badge>
												)}
												<span className="font-medium">
													{getMissionLabel(mission)}
												</span>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2 text-sm">
												<CalendarIcon className="h-4 w-4 text-muted-foreground" />
												{format(new Date(mission.startAt), "dd/MM/yyyy HH:mm", {
													locale: fr,
												})}
											</div>
										</TableCell>
										<TableCell>
											<Badge className={STATUS_STYLES[mission.status] || ""}>
												{t(`missionStatus.${mission.status.toLowerCase()}`)}
											</Badge>
										</TableCell>
										<TableCell>
											{mission.driver ? (
												<span className="text-sm">
													{mission.driver.firstName} {mission.driver.lastName}
												</span>
											) : (
												<span className="text-muted-foreground text-sm">
													{t("operations.unassigned")}
												</span>
											)}
										</TableCell>
										<TableCell className="text-right">
											<Button
												variant="link"
												size="sm"
												className="h-auto gap-1 p-0"
												onClick={() =>
													router.push(
														`/app/${organizationSlug}/dispatch?mission=${mission.id}`,
													)
												}
											>
												<LinkIcon className="h-3 w-3" />
												{t("operations.viewInDispatch")}
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			{/* Internal Mission Modal */}
			<InternalMissionModal
				open={isModalOpen}
				onOpenChange={setIsModalOpen}
				orderId={orderId}
				onSuccess={handleMissionCreated}
			/>
		</>
	);
}
