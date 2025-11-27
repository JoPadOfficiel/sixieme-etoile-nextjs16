"use client";

import { Badge } from "@ui/components/badge";
import { TableCell, TableRow } from "@ui/components/table";
import { MapPin, ArrowRight, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { cn } from "@ui/lib";
import { DispatchBadges } from "./DispatchBadges";
import type { MissionListItem } from "../types";

/**
 * MissionRow Component
 *
 * Story 8.1: Implement Dispatch Screen Layout
 *
 * Individual mission row in the missions list table.
 * Shows time, route, client, vehicle/driver, and dispatch badges.
 *
 * @see AC2: Missions List Display
 */

interface MissionRowProps {
	mission: MissionListItem;
	isSelected: boolean;
	onSelect: (missionId: string) => void;
}

export function MissionRow({ mission, isSelected, onSelect }: MissionRowProps) {
	const t = useTranslations("dispatch.missions");

	const pickupDate = new Date(mission.pickupAt);

	// Truncate address for display
	const truncateAddress = (address: string, maxLength = 30) => {
		if (address.length <= maxLength) return address;
		return `${address.substring(0, maxLength)}...`;
	};

	return (
		<TableRow
			className={cn(
				"cursor-pointer transition-colors",
				isSelected && "bg-primary/5 border-l-2 border-l-primary"
			)}
			onClick={() => onSelect(mission.id)}
			data-testid="mission-row"
			data-selected={isSelected}
		>
			{/* Time Window */}
			<TableCell className="whitespace-nowrap">
				<div className="flex items-center gap-2">
					<Clock className="size-4 text-muted-foreground" />
					<div>
						<div className="font-medium">{format(pickupDate, "HH:mm")}</div>
						<div className="text-xs text-muted-foreground">
							{format(pickupDate, "dd/MM/yyyy")}
						</div>
					</div>
				</div>
			</TableCell>

			{/* Route */}
			<TableCell>
				<div className="flex items-center gap-1 text-sm">
					<MapPin className="size-3.5 text-green-600 flex-shrink-0" />
					<span className="truncate max-w-[120px]" title={mission.pickupAddress}>
						{truncateAddress(mission.pickupAddress, 25)}
					</span>
					<ArrowRight className="size-3 text-muted-foreground flex-shrink-0" />
					<MapPin className="size-3.5 text-red-600 flex-shrink-0" />
					<span className="truncate max-w-[120px]" title={mission.dropoffAddress}>
						{truncateAddress(mission.dropoffAddress, 25)}
					</span>
				</div>
			</TableCell>

			{/* Client */}
			<TableCell>
				<div className="flex items-center gap-2">
					<span className="font-medium truncate max-w-[120px]">
						{mission.contact.displayName}
					</span>
					<Badge
						variant={mission.contact.isPartner ? "default" : "secondary"}
						className="text-xs"
					>
						{mission.contact.isPartner ? t("partner") : t("private")}
					</Badge>
				</div>
			</TableCell>

			{/* Vehicle / Driver */}
			<TableCell>
				{mission.assignment?.vehicleName ? (
					<div className="text-sm">
						<div className="font-medium">{mission.assignment.vehicleName}</div>
						{mission.assignment.driverName && (
							<div className="text-xs text-muted-foreground">
								{mission.assignment.driverName}
							</div>
						)}
					</div>
				) : (
					<span className="text-sm text-muted-foreground italic">
						{t("unassigned")}
					</span>
				)}
			</TableCell>

			{/* Dispatch Badges */}
			<TableCell>
				<DispatchBadges
					profitability={mission.profitability}
					compliance={mission.compliance}
					assignment={mission.assignment}
				/>
			</TableCell>
		</TableRow>
	);
}

export default MissionRow;
