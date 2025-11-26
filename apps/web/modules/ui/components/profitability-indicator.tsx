"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { TrendingUp, AlertTriangle, TrendingDown } from "lucide-react";

import { cn } from "@ui/lib";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./tooltip";

/**
 * Story 4.7: Profitability Indicator Component
 * 
 * Visual indicator showing the profitability status of a quote or mission.
 * Uses color + icon + label for accessibility (not color alone).
 * 
 * States:
 * - green: Profitable (margin >= green threshold, default 20%)
 * - orange: Low margin (margin >= orange threshold but < green, default 0-20%)
 * - red: Loss (margin < orange threshold, default < 0%)
 */

// ============================================================================
// Types
// ============================================================================

export type ProfitabilityState = "green" | "orange" | "red";

export interface ProfitabilityThresholds {
	greenThreshold: number;
	orangeThreshold: number;
}

export interface ProfitabilityIndicatorProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof profitabilityVariants> {
	/** The profitability state */
	state: ProfitabilityState;
	/** The actual margin percentage */
	marginPercent: number;
	/** The thresholds used for classification */
	thresholds?: ProfitabilityThresholds;
	/** Whether to show the percentage value */
	showPercent?: boolean;
	/** Whether to show the label text */
	showLabel?: boolean;
	/** Whether to show the tooltip on hover */
	showTooltip?: boolean;
}

// ============================================================================
// Variants
// ============================================================================

const profitabilityVariants = cva(
	"inline-flex items-center gap-1.5 rounded-full font-medium transition-colors",
	{
		variants: {
			size: {
				sm: "px-2 py-0.5 text-xs",
				md: "px-2.5 py-1 text-sm",
				lg: "px-3 py-1.5 text-base",
			},
			state: {
				green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
				orange: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
				red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
			},
		},
		defaultVariants: {
			size: "md",
			state: "green",
		},
	}
);

const iconSizes = {
	sm: "h-3 w-3",
	md: "h-4 w-4",
	lg: "h-5 w-5",
};

// ============================================================================
// Helper Functions
// ============================================================================

function getLabel(state: ProfitabilityState): string {
	switch (state) {
		case "green":
			return "Profitable";
		case "orange":
			return "Low margin";
		case "red":
			return "Loss";
	}
}

function getIcon(state: ProfitabilityState, size: "sm" | "md" | "lg" = "md") {
	const className = iconSizes[size];
	switch (state) {
		case "green":
			return <TrendingUp className={className} aria-hidden="true" />;
		case "orange":
			return <AlertTriangle className={className} aria-hidden="true" />;
		case "red":
			return <TrendingDown className={className} aria-hidden="true" />;
	}
}

function getTooltipContent(
	state: ProfitabilityState,
	marginPercent: number,
	thresholds: ProfitabilityThresholds
): string {
	const marginStr = marginPercent.toFixed(1);
	const greenStr = thresholds.greenThreshold.toFixed(0);
	const orangeStr = thresholds.orangeThreshold.toFixed(0);

	let statusLine: string;
	switch (state) {
		case "green":
			statusLine = `Margin: ${marginStr}% (≥${greenStr}% target)`;
			break;
		case "orange":
			statusLine = `Margin: ${marginStr}% (below ${greenStr}% target)`;
			break;
		case "red":
			statusLine = `Margin: ${marginStr}% (loss)`;
			break;
	}

	return `${statusLine}\nThresholds: Green ≥${greenStr}%, Orange ≥${orangeStr}%, Red <${orangeStr}%`;
}

// ============================================================================
// Component
// ============================================================================

const DEFAULT_THRESHOLDS: ProfitabilityThresholds = {
	greenThreshold: 20,
	orangeThreshold: 0,
};

const ProfitabilityIndicator = React.forwardRef<
	HTMLDivElement,
	ProfitabilityIndicatorProps
>(
	(
		{
			className,
			state,
			marginPercent,
			thresholds = DEFAULT_THRESHOLDS,
			size = "md",
			showPercent = true,
			showLabel = true,
			showTooltip = true,
			...props
		},
		ref
	) => {
		const label = getLabel(state);
		const icon = getIcon(state, size ?? "md");
		const tooltipContent = getTooltipContent(state, marginPercent, thresholds);

		const indicator = (
			<div
				ref={ref}
				className={cn(profitabilityVariants({ size, state }), className)}
				role="status"
				aria-label={`${label}: ${marginPercent.toFixed(1)}% margin`}
				{...props}
			>
				{icon}
				{showLabel && <span>{label}</span>}
				{showPercent && (
					<span className="font-semibold">{marginPercent.toFixed(1)}%</span>
				)}
			</div>
		);

		if (!showTooltip) {
			return indicator;
		}

		return (
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>{indicator}</TooltipTrigger>
					<TooltipContent className="max-w-xs whitespace-pre-line">
						{tooltipContent}
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		);
	}
);

ProfitabilityIndicator.displayName = "ProfitabilityIndicator";

// ============================================================================
// Compact Variant (Icon only with tooltip)
// ============================================================================

export interface ProfitabilityDotProps
	extends React.HTMLAttributes<HTMLDivElement> {
	state: ProfitabilityState;
	marginPercent: number;
	thresholds?: ProfitabilityThresholds;
}

const dotVariants = cva("rounded-full", {
	variants: {
		size: {
			sm: "h-2 w-2",
			md: "h-2.5 w-2.5",
			lg: "h-3 w-3",
		},
		state: {
			green: "bg-emerald-500",
			orange: "bg-amber-500",
			red: "bg-red-500",
		},
	},
	defaultVariants: {
		size: "md",
		state: "green",
	},
});

/**
 * Compact dot indicator for use in tables and lists
 */
const ProfitabilityDot = React.forwardRef<
	HTMLDivElement,
	ProfitabilityDotProps & VariantProps<typeof dotVariants>
>(
	(
		{
			className,
			state,
			marginPercent,
			thresholds = DEFAULT_THRESHOLDS,
			size = "md",
			...props
		},
		ref
	) => {
		const label = getLabel(state);
		const tooltipContent = getTooltipContent(state, marginPercent, thresholds);

		return (
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<div
							ref={ref}
							className={cn(dotVariants({ size, state }), className)}
							role="status"
							aria-label={`${label}: ${marginPercent.toFixed(1)}% margin`}
							{...props}
						/>
					</TooltipTrigger>
					<TooltipContent className="max-w-xs whitespace-pre-line">
						{tooltipContent}
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		);
	}
);

ProfitabilityDot.displayName = "ProfitabilityDot";

export {
	ProfitabilityIndicator,
	ProfitabilityDot,
	profitabilityVariants,
	dotVariants,
	getLabel as getProfitabilityLabel,
	getIcon as getProfitabilityIcon,
};
