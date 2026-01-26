"use client";

import { Badge } from "@ui/components/badge";
import { cn } from "@ui/lib";
import { format } from "date-fns";
import { Calendar, Car, Clock, MapPin, Phone, User } from "lucide-react";
import { useTranslations } from "next-intl";

import type { MissionListItem } from "../types";
import { DispatchBadges } from "./DispatchBadges";
import { NotesIndicator } from "./NotesIndicator";
import { StaffingIndicators } from "./StaffingIndicators";
import { SubcontractedBadge } from "./SubcontractedBadge";

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
	// Address truncation logic removed

	return (
		<div
			className={cn(
				"cursor-pointer border-b p-3 transition-colors hover:bg-muted/50",
				isSelected && "border-l-2 border-l-primary bg-primary/5",
			)}
			onClick={() => onSelect(mission.id)}
			data-testid="mission-row"
			data-selected={isSelected}
		>
			{/* Row 1: Time + Client + Trip Type */}
			<div className="mb-2 flex items-center gap-3">
				{/* Time */}
				<div className="flex flex-shrink-0 items-center gap-1.5">
					<Clock className="size-4 text-muted-foreground" />
					<div className="font-semibold">{format(pickupDate, "HH:mm")}</div>
					<div className="text-muted-foreground text-xs">
						{format(pickupDate, "dd/MM/yyyy")}
					</div>
				</div>
				{/* Client */}
				<div className="flex min-w-0 flex-1 items-center gap-1.5">
					<div className="flex min-w-0 flex-col">
						<div className="flex items-center gap-1.5">
							{/* Story 29.7: Display Mission.ref */}
							{mission.ref && (
								<Badge
									variant="outline"
									className="flex-shrink-0 border-blue-500/50 bg-blue-500/10 px-1.5 py-0 text-blue-700 text-xs dark:text-blue-400"
								>
									{mission.ref}
								</Badge>
							)}
							<span className="break-words font-medium">
								{mission.endCustomer
									? `${mission.endCustomer.firstName} ${mission.endCustomer.lastName}`
									: mission.contact.displayName}
							</span>
							<Badge
								variant={mission.contact.isPartner ? "default" : "secondary"}
								className="flex-shrink-0 px-1.5 py-0 text-xs"
							>
								{mission.contact.isPartner ? t("partner") : t("private")}
							</Badge>
							{/* Story 22.9: STAY trip type indicator */}
							{mission.tripType === "STAY" && mission.stayDays && (
								<Badge
									variant="outline"
									className="flex-shrink-0 border-purple-500/50 bg-purple-500/10 px-1.5 py-0 text-purple-700 text-xs dark:text-purple-400"
								>
									<Calendar className="mr-1 size-3" />
									{mission.stayDays.length} {t("days")}
								</Badge>
							)}
							{/* Story 29.7: Display mission status badge */}
							{mission.missionStatus && (
								<Badge
									variant={
										mission.missionStatus === "COMPLETED"
											? "default"
											: mission.missionStatus === "IN_PROGRESS"
												? "secondary"
												: mission.missionStatus === "CANCELLED"
													? "destructive"
													: "outline"
									}
									className="flex-shrink-0 px-1.5 py-0 text-xs"
								>
									{mission.missionStatus}
								</Badge>
							)}
						</div>
						{/* Show Agency name if End Customer is displayed */}
						{mission.endCustomer && (
							<span className="break-words text-muted-foreground text-xs">
								{t("via")} {mission.contact.displayName}
							</span>
						)}
						{/* Contact Phone */}
						{(mission.contact.phone ||
							(mission.endCustomer && mission.endCustomer.phone)) && (
							<div className="mt-0.5 flex items-center gap-1 text-muted-foreground text-xs">
								<Phone className="size-3" />
								<span>
									{mission.endCustomer?.phone || mission.contact.phone}
								</span>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Row 1.5: Badges */}
			<div
				className="mb-3 flex items-center gap-2 overflow-x-auto"
				style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
			>
				<DispatchBadges
					profitability={mission.profitability}
					compliance={mission.compliance}
					assignment={mission.assignment}
					className="shrink-0"
				/>

				{(mission.notes ||
					mission.staffingSummary ||
					(mission.isSubcontracted && mission.subcontractor)) && (
					<div className="mx-1 h-4 w-px shrink-0 bg-border" />
				)}

				<div className="flex shrink-0 items-center gap-1">
					{/* Story 22.11: Notes indicator */}
					<NotesIndicator notes={mission.notes ?? null} />
					{/* Story 22.9: Staffing indicators */}
					<StaffingIndicators staffingSummary={mission.staffingSummary} />
					{/* Story 22.4: Subcontracted badge */}
					{mission.isSubcontracted && mission.subcontractor && (
						<SubcontractedBadge subcontractor={mission.subcontractor} />
					)}
				</div>
			</div>

			{/* Row 2: Route (pickup → dropoff) */}
			<div className="mb-2 flex flex-col gap-1 text-sm">
				<div className="flex items-start gap-1.5">
					<MapPin className="mt-0.5 size-3.5 flex-shrink-0 text-green-600" />
					<span className="break-words">{mission.pickupAddress || "—"}</span>
				</div>
				<div className="flex items-start gap-1.5">
					<MapPin className="mt-0.5 size-3.5 flex-shrink-0 text-red-600" />
					<span className="break-words">{mission.dropoffAddress || "—"}</span>
				</div>
			</div>

			{/* Row 3: Vehicle + Driver */}
			<div className="flex items-center gap-4 text-muted-foreground text-sm">
				{mission.assignment?.vehicleName ? (
					<>
						<div className="flex items-center gap-1.5">
							<Car className="size-3.5" />
							<span className="font-medium text-foreground">
								{mission.assignment.vehicleName}
							</span>
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
