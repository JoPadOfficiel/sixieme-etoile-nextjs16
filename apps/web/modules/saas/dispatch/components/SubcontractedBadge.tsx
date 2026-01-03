"use client";

/**
 * SubcontractedBadge Component
 * Story 22.4: Implement Complete Subcontracting System
 *
 * Displays a badge for subcontracted missions with popover details
 */

import { useTranslations } from "next-intl";
import { Badge } from "@ui/components/badge";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@ui/components/popover";
import { Building2Icon, PhoneIcon, CalendarIcon, EuroIcon } from "lucide-react";
import { format } from "date-fns";
import type { MissionSubcontractor } from "../types/mission";

interface SubcontractedBadgeProps {
	subcontractor: MissionSubcontractor;
}

export function SubcontractedBadge({ subcontractor }: SubcontractedBadgeProps) {
	const t = useTranslations("dispatch");

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Badge
					variant="outline"
					className="cursor-pointer bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
				>
					<Building2Icon className="size-3 mr-1" />
					{t("subcontracted")}
				</Badge>
			</PopoverTrigger>
			<PopoverContent className="w-72" align="end">
				<div className="space-y-3">
					<div className="font-semibold text-sm border-b pb-2">
						{t("subcontractedDetails")}
					</div>

					{/* Company Name */}
					<div className="flex items-start gap-2">
						<Building2Icon className="size-4 text-muted-foreground mt-0.5" />
						<div>
							<div className="font-medium">{subcontractor.companyName}</div>
							{subcontractor.contactName && (
								<div className="text-sm text-muted-foreground">
									{subcontractor.contactName}
								</div>
							)}
						</div>
					</div>

					{/* Phone */}
					{subcontractor.phone && (
						<div className="flex items-center gap-2">
							<PhoneIcon className="size-4 text-muted-foreground" />
							<a
								href={`tel:${subcontractor.phone}`}
								className="text-sm hover:underline"
							>
								{subcontractor.phone}
							</a>
						</div>
					)}

					{/* Agreed Price */}
					<div className="flex items-center gap-2">
						<EuroIcon className="size-4 text-muted-foreground" />
						<div className="text-sm">
							<span className="font-medium">
								{subcontractor.agreedPrice.toFixed(2)} €
							</span>
							<span className="text-muted-foreground ml-1">
								({t("agreedPrice")})
							</span>
						</div>
					</div>

					{/* Subcontracted Date */}
					<div className="flex items-center gap-2">
						<CalendarIcon className="size-4 text-muted-foreground" />
						<div className="text-sm text-muted-foreground">
							{format(new Date(subcontractor.subcontractedAt), "dd/MM/yyyy HH:mm")}
						</div>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}

export default SubcontractedBadge;
