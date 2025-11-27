"use client";

import { Badge } from "@ui/components/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@ui/components/tooltip";
import {
	Car,
	User,
	MapPin,
	ShieldCheck,
	AlertTriangle,
	XCircle,
	Euro,
	IdCard,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";
import { FlexibilityScore } from "./FlexibilityScore";
import type { AssignmentCandidate } from "../types/assignment";

/**
 * CandidateRow Component
 *
 * Story 8.2: Implement Assignment Drawer with Candidate Vehicles/Drivers & Flexibility Score
 * Story 8.3: Multi-Base Optimisation & Visualisation - Added hover callbacks
 *
 * Individual candidate row in the assignment drawer.
 * Shows vehicle, driver, score, compliance, and cost.
 *
 * @see AC2: Candidate List Display
 * @see Story 8.3 AC2: Route Preview on Hover
 */

interface CandidateRowProps {
	candidate: AssignmentCandidate;
	isSelected: boolean;
	onSelect: (candidateId: string) => void;
	// Story 8.3: Hover callbacks for map preview
	onHoverStart?: (candidateId: string) => void;
	onHoverEnd?: () => void;
	/** Story 8.3: Show cost comparison with best option */
	costDifference?: number;
	isBestOption?: boolean;
}

export function CandidateRow({
	candidate,
	isSelected,
	onSelect,
	onHoverStart,
	onHoverEnd,
	costDifference,
	isBestOption = false,
}: CandidateRowProps) {
	const t = useTranslations("dispatch.assignment.candidate");

	const complianceConfig = getComplianceConfig(candidate.compliance.status);

	return (
		<div
			className={cn(
				"p-3 rounded-lg border cursor-pointer transition-all",
				"hover:border-primary/50 hover:bg-accent/50",
				isSelected && "border-primary bg-primary/5 ring-1 ring-primary/20",
			)}
			onClick={() => onSelect(candidate.vehicleId)}
			onMouseEnter={() => onHoverStart?.(candidate.vehicleId)}
			onMouseLeave={() => onHoverEnd?.()}
			data-testid="candidate-row"
			data-selected={isSelected}
		>
			<div className="flex items-start justify-between gap-3">
				{/* Left: Vehicle & Driver Info */}
				<div className="flex-1 min-w-0 space-y-2">
					{/* Vehicle */}
					<div className="flex items-center gap-2">
						<Car className="size-4 text-muted-foreground flex-shrink-0" />
						<span className="font-medium truncate">{candidate.vehicleName}</span>
						<Badge variant="secondary" className="text-xs">
							{candidate.vehicleCategory.code}
						</Badge>
					</div>

					{/* Driver */}
					<div className="flex items-center gap-2">
						<User className="size-4 text-muted-foreground flex-shrink-0" />
						{candidate.driverName ? (
							<>
								<span className="text-sm truncate">{candidate.driverName}</span>
								{candidate.driverLicenses.length > 0 && (
									<div className="flex items-center gap-1">
										<IdCard className="size-3 text-muted-foreground" />
										<span className="text-xs text-muted-foreground">
											{candidate.driverLicenses.join(", ")}
										</span>
									</div>
								)}
							</>
						) : (
							<span className="text-sm text-muted-foreground italic">
								{t("noDriverAssigned")}
							</span>
						)}
					</div>

					{/* Base */}
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<MapPin className="size-3 flex-shrink-0" />
						<span className="truncate">{candidate.baseName}</span>
						<span>•</span>
						<span>{candidate.baseDistanceKm.toFixed(1)} km</span>
					</div>
				</div>

				{/* Right: Score, Compliance, Cost */}
				<div className="flex flex-col items-end gap-2">
					{/* Flexibility Score */}
					<FlexibilityScore
						score={candidate.flexibilityScore}
						breakdown={candidate.scoreBreakdown}
						size="md"
					/>

					{/* Compliance Badge */}
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Badge
									variant="outline"
									className={cn("text-xs", complianceConfig.className)}
								>
									<complianceConfig.Icon className="size-3 mr-1" />
									{candidate.compliance.status}
								</Badge>
							</TooltipTrigger>
							{candidate.compliance.warnings.length > 0 && (
								<TooltipContent side="left">
									<ul className="text-xs space-y-0.5">
										{candidate.compliance.warnings.map((warning, i) => (
											<li key={i}>• {warning}</li>
										))}
									</ul>
								</TooltipContent>
							)}
						</Tooltip>
					</TooltipProvider>

					{/* Estimated Cost */}
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div className="flex flex-col items-end gap-0.5">
									<div className="flex items-center gap-1 text-sm font-medium">
										<Euro className="size-3.5 text-muted-foreground" />
										<span>{candidate.estimatedCost.total.toFixed(2)}</span>
									</div>
									{/* Story 8.3: Cost comparison indicator */}
									{isBestOption && (
										<Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400">
											{t("costComparison.best")}
										</Badge>
									)}
									{!isBestOption && costDifference !== undefined && costDifference > 0 && (
										<span className="text-[10px] text-muted-foreground">
											+€{costDifference.toFixed(2)}
										</span>
									)}
								</div>
							</TooltipTrigger>
							<TooltipContent side="left">
								<div className="space-y-1 text-xs">
									<p className="font-semibold">{t("costBreakdown.title")}</p>
									<div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
										<span className="text-muted-foreground">{t("costBreakdown.approach")}</span>
										<span className="text-right">€{candidate.estimatedCost.approach.toFixed(2)}</span>
										<span className="text-muted-foreground">{t("costBreakdown.service")}</span>
										<span className="text-right">€{candidate.estimatedCost.service.toFixed(2)}</span>
										<span className="text-muted-foreground">{t("costBreakdown.return")}</span>
										<span className="text-right">€{candidate.estimatedCost.return.toFixed(2)}</span>
									</div>
									<div className="pt-1 border-t grid grid-cols-2 gap-x-4 font-semibold">
										<span>{t("costBreakdown.total")}</span>
										<span className="text-right">€{candidate.estimatedCost.total.toFixed(2)}</span>
									</div>
								</div>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
			</div>
		</div>
	);
}

function getComplianceConfig(status: "OK" | "WARNING" | "VIOLATION") {
	switch (status) {
		case "OK":
			return {
				Icon: ShieldCheck,
				className: "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400",
			};
		case "WARNING":
			return {
				Icon: AlertTriangle,
				className: "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400",
			};
		case "VIOLATION":
			return {
				Icon: XCircle,
				className: "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400",
			};
	}
}

export default CandidateRow;
