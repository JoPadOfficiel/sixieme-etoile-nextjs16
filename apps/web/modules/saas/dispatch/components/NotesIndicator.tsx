"use client";

import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@ui/components/tooltip";
import { Badge } from "@ui/components/badge";
import { FileTextIcon, AlertCircleIcon } from "lucide-react";
import { cn } from "@ui/lib";

/**
 * NotesIndicator Component
 *
 * Story 22.11: Fix Quote Notes Display in Dispatch
 *
 * Shows a notes indicator icon in the mission list when notes are present.
 * Displays a tooltip with notes preview on hover.
 *
 * @see AC2: Notes Indicator in Mission List
 */

interface NotesIndicatorProps {
	notes: string | null;
	onClick?: () => void;
	className?: string;
}

const URGENT_KEYWORDS = /\b(VIP|URGENT|PRIORITY|PRIORITÉ|PRIORITE)\b/gi;

/**
 * Check if notes contain urgent keywords
 */
function hasUrgentKeywords(text: string): boolean {
	URGENT_KEYWORDS.lastIndex = 0;
	return URGENT_KEYWORDS.test(text);
}

/**
 * Truncate text for preview
 */
function truncateText(text: string, maxLength = 100): string {
	if (text.length <= maxLength) return text;
	return `${text.substring(0, maxLength).trim()}...`;
}

export function NotesIndicator({ notes, onClick, className }: NotesIndicatorProps) {
	if (!notes || notes.trim().length === 0) {
		return null;
	}

	const isUrgent = hasUrgentKeywords(notes);
	const preview = truncateText(notes);

	return (
		<TooltipProvider delayDuration={200}>
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onClick?.();
						}}
						className={cn(
							"inline-flex items-center justify-center rounded-md p-1 transition-colors",
							"hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
							className
						)}
						data-testid="notes-indicator"
					>
						{isUrgent ? (
							<Badge
								variant="outline"
								className="px-1.5 py-0.5 bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300"
							>
								<AlertCircleIcon className="size-3 mr-1" />
								<span className="text-xs font-medium">!</span>
							</Badge>
						) : (
							<FileTextIcon className="size-4 text-muted-foreground hover:text-foreground" />
						)}
					</button>
				</TooltipTrigger>
				<TooltipContent
					side="top"
					align="center"
					className="max-w-[300px] text-sm"
				>
					<p className="whitespace-pre-wrap">{preview}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

export default NotesIndicator;
