"use client";

import { Badge } from "@ui/components/badge";
import { MapPin, ArrowRight, Clock, Car, User, Calendar } from "lucide-react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { cn } from "@ui/lib";

import { DispatchBadges } from "./DispatchBadges";
import { SubcontractedBadge } from "./SubcontractedBadge";
import { StaffingIndicators } from "./StaffingIndicators";
import { NotesIndicator } from "./NotesIndicator";
import type { MissionListItem } from "../types";

/**
 * MissionRow Component
 *
 * Story 8.1: Implement Dispatch Screen Layout
 *
 * Individual mission card in the missions list.
 * Compact vertical layout to avoid horizontal scrolling.
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
	const truncateAddress = (address: string | null | undefined, maxLength = 35) => {
		if (!address) return "—";
		if (address.length <= maxLength) return address;
		return `${address.substring(0, maxLength)}...`;
	};

	return (
		<div
			className={cn(
				"p-3 border-b cursor-pointer transition-colors hover:bg-muted/50",
				isSelected && "bg-primary/5 border-l-2 border-l-primary"
			)}
			onClick={() => onSelect(mission.id)}
			data-testid="mission-row"
			data-selected={isSelected}
		>
			{/* Row 1: Time + Client + Trip Type */}
			<div className="flex items-center gap-3 mb-2">
				{/* Time */}
				<div className="flex items-center gap-1.5 flex-shrink-0">
					<Clock className="size-4 text-muted-foreground" />
					<div className="font-semibold">{format(pickupDate, "HH:mm")}</div>
					<div className="text-xs text-muted-foreground">
						{format(pickupDate, "dd/MM/yyyy")}
					</div>
				</div>
				{/* Client */}
				<div className="flex items-center gap-1.5 min-w-0 flex-1">
					<span className="font-medium truncate">
						{mission.contact.displayName}
					</span>
					<Badge
						variant={mission.contact.isPartner ? "default" : "secondary"}
						className="text-xs px-1.5 py-0 flex-shrink-0"
					>
						{mission.contact.isPartner ? t("partner") : t("private")}
					</Badge>
					{/* Story 22.9: STAY trip type indicator */}
					{mission.tripType === "STAY" && mission.stayDays && (
						<Badge
							variant="outline"
							className="text-xs px-1.5 py-0 border-purple-500/50 bg-purple-500/10 text-purple-700 dark:text-purple-400 flex-shrink-0"
						>
							<Calendar className="size-3 mr-1" />
							{mission.stayDays.length} {t("days")}
						</Badge>
					)}
				</div>
			</div>

			{/* Row 1.5: Badges (scrollable) */}
			<div className="flex items-center gap-1 overflow-x-auto mb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
				{/* Story 22.11: Notes indicator */}
				<NotesIndicator notes={mission.notes ?? null} />
				{/* Story 22.9: Staffing indicators */}
				<StaffingIndicators staffingSummary={mission.staffingSummary} />
				{/* Story 22.4: Subcontracted badge */}
				{mission.isSubcontracted && mission.subcontractor && (
					<SubcontractedBadge subcontractor={mission.subcontractor} />
				)}
				<DispatchBadges
					profitability={mission.profitability}
					compliance={mission.compliance}
					assignment={mission.assignment}
				/>
			</div>

			{/* Row 2: Route (pickup → dropoff) */}
			<div className="flex items-center gap-1.5 text-sm mb-2">
				<MapPin className="size-3.5 text-green-600 flex-shrink-0" />
				<span className="truncate" title={mission.pickupAddress}>
					{truncateAddress(mission.pickupAddress)}
				</span>
				<ArrowRight className="size-3 text-muted-foreground flex-shrink-0 mx-1" />
				<MapPin className="size-3.5 text-red-600 flex-shrink-0" />
				<span className="truncate" title={mission.dropoffAddress}>
					{truncateAddress(mission.dropoffAddress)}
				</span>
			</div>

			{/* Row 3: Vehicle + Driver */}
			<div className="flex items-center gap-4 text-sm text-muted-foreground">
				{mission.assignment?.vehicleName ? (
					<>
						<div className="flex items-center gap-1.5">
							<Car className="size-3.5" />
							<span className="font-medium text-foreground">{mission.assignment.vehicleName}</span>
						</div>
						{mission.assignment.driverName && (
							<div className="flex items-center gap-1.5">
								<User className="size-3.5" />
								<span>{mission.assignment.driverName}</span>
							</div>
						)}
					</>
				) : (
					<span className="italic">{t("unassigned")}</span>
				)}
			</div>
		</div>
	);
}

export default MissionRow;
