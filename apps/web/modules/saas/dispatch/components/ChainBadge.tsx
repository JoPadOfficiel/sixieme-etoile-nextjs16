"use client";

import { Link2 } from "lucide-react";
import { Badge } from "@ui/components/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@ui/components/tooltip";
import type { MissionChainInfo } from "../types";

/**
 * ChainBadge Component
 *
 * Story 8.4: Detect & Suggest Trip Chaining Opportunities
 *
 * Displays a badge indicating that a mission is part of a chain.
 */

interface ChainBadgeProps {
	chainInfo: MissionChainInfo | null;
	chainedMissionId?: string | null;
	onClick?: () => void;
}

export function ChainBadge({ chainInfo, chainedMissionId, onClick }: ChainBadgeProps) {
	// Don't render if not chained
	if (!chainInfo?.chainId) {
		return null;
	}

	const orderLabel = chainInfo.chainOrder === 1 ? "1st" : "2nd";

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Badge
						variant="outline"
						className="cursor-pointer hover:bg-blue-50 border-blue-200 text-blue-700 gap-1"
						onClick={onClick}
						data-testid="chain-badge"
					>
						<Link2 className="h-3 w-3" />
						<span>{orderLabel}</span>
					</Badge>
				</TooltipTrigger>
				<TooltipContent>
					<p className="text-sm">
						Part of a chain ({orderLabel} in sequence)
					</p>
					{chainedMissionId && (
						<p className="text-xs text-muted-foreground">
							Click to view chained mission
						</p>
					)}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
