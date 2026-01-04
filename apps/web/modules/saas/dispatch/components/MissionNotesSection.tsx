"use client";

import { useState, useMemo } from "react";
import { Button } from "@ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Textarea } from "@ui/components/textarea";
import { Badge } from "@ui/components/badge";
import {
	FileTextIcon,
	EditIcon,
	SaveIcon,
	Loader2Icon,
	XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";

/**
 * MissionNotesSection Component
 *
 * Story 22.11: Fix Quote Notes Display in Dispatch
 *
 * Displays and allows editing of mission notes in the dispatch interface.
 * Highlights special keywords (VIP, URGENT, etc.) for quick identification.
 *
 * @see AC1: Notes Display in Mission Detail Panel
 * @see AC3: Notes Editing in Dispatch
 * @see AC4: Notes Categories and Highlighting
 */

interface MissionNotesSectionProps {
	notes: string | null;
	missionId: string;
	onUpdateNotes: (notes: string | null) => Promise<void>;
	isUpdating: boolean;
	className?: string;
}

interface HighlightKeyword {
	pattern: RegExp;
	className: string;
	label: string;
}

const HIGHLIGHT_KEYWORDS: HighlightKeyword[] = [
	{
		pattern: /\bVIP\b/gi,
		className: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300",
		label: "VIP",
	},
	{
		pattern: /\bURGENT\b/gi,
		className: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300",
		label: "URGENT",
	},
	{
		pattern: /\bFRAGILE\b/gi,
		className: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300",
		label: "FRAGILE",
	},
	{
		pattern: /\b(WHEELCHAIR|FAUTEUIL ROULANT)\b/gi,
		className: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300",
		label: "WHEELCHAIR",
	},
	{
		pattern: /\b(CHILD SEAT|SIÈGE ENFANT|SIEGE ENFANT)\b/gi,
		className: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300",
		label: "CHILD SEAT",
	},
	{
		pattern: /\b(PRIORITY|PRIORITÉ|PRIORITE)\b/gi,
		className: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300",
		label: "PRIORITY",
	},
];

/**
 * Detects which keywords are present in the notes
 */
function detectKeywords(text: string): string[] {
	const found: string[] = [];
	for (const keyword of HIGHLIGHT_KEYWORDS) {
		if (keyword.pattern.test(text)) {
			found.push(keyword.label);
			// Reset regex lastIndex
			keyword.pattern.lastIndex = 0;
		}
	}
	return found;
}

/**
 * Highlights keywords in text by wrapping them in Badge components
 */
function highlightKeywords(text: string): React.ReactNode[] {
	if (!text) return [];

	// Build a combined pattern for all keywords
	const allPatterns = HIGHLIGHT_KEYWORDS.map((k) => k.pattern.source).join("|");
	const combinedPattern = new RegExp(`(${allPatterns})`, "gi");

	const parts = text.split(combinedPattern);

	return parts.map((part, index) => {
		// Check if this part matches any keyword
		for (const keyword of HIGHLIGHT_KEYWORDS) {
			keyword.pattern.lastIndex = 0;
			if (keyword.pattern.test(part)) {
				keyword.pattern.lastIndex = 0;
				return (
					<Badge
						key={index}
						variant="outline"
						className={cn("mx-0.5 font-semibold", keyword.className)}
					>
						{part.toUpperCase()}
					</Badge>
				);
			}
		}
		// Regular text - preserve whitespace
		return <span key={index}>{part}</span>;
	});
}

export function MissionNotesSection({
	notes,
	onUpdateNotes,
	isUpdating,
	className,
}: MissionNotesSectionProps) {
	const t = useTranslations("dispatch.notes");
	const [isEditing, setIsEditing] = useState(false);
	const [notesValue, setNotesValue] = useState(notes || "");

	// Detect keywords for summary badges
	const detectedKeywords = useMemo(() => {
		return notes ? detectKeywords(notes) : [];
	}, [notes]);

	const handleSave = async () => {
		await onUpdateNotes(notesValue.trim() || null);
		setIsEditing(false);
	};

	const handleCancel = () => {
		setNotesValue(notes || "");
		setIsEditing(false);
	};

	return (
		<Card className={cn("", className)} data-testid="mission-notes-section">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<FileTextIcon className="size-4 text-muted-foreground" />
						<CardTitle className="text-base">{t("title")}</CardTitle>
						{/* Show keyword badges in header */}
						{!isEditing && detectedKeywords.length > 0 && (
							<div className="flex items-center gap-1 ml-2">
								{detectedKeywords.map((keyword) => {
									const config = HIGHLIGHT_KEYWORDS.find((k) => k.label === keyword);
									return (
										<Badge
											key={keyword}
											variant="outline"
											className={cn("text-xs px-1.5 py-0", config?.className)}
										>
											{keyword}
										</Badge>
									);
								})}
							</div>
						)}
					</div>
					{!isEditing && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setIsEditing(true)}
							data-testid="edit-notes-button"
						>
							<EditIcon className="size-4 mr-1" />
							{t("edit")}
						</Button>
					)}
				</div>
			</CardHeader>
			<CardContent>
				{isEditing ? (
					<div className="space-y-3">
						<Textarea
							value={notesValue}
							onChange={(e) => setNotesValue(e.target.value)}
							placeholder={t("placeholder")}
							rows={4}
							disabled={isUpdating}
							className="resize-none"
							data-testid="notes-textarea"
						/>
						<div className="flex items-center gap-2">
							<Button
								size="sm"
								onClick={handleSave}
								disabled={isUpdating}
								data-testid="save-notes-button"
							>
								{isUpdating ? (
									<Loader2Icon className="size-4 mr-1 animate-spin" />
								) : (
									<SaveIcon className="size-4 mr-1" />
								)}
								{t("save")}
							</Button>
							<Button
								size="sm"
								variant="outline"
								onClick={handleCancel}
								disabled={isUpdating}
								data-testid="cancel-notes-button"
							>
								<XIcon className="size-4 mr-1" />
								{t("cancel")}
							</Button>
						</div>
						<p className="text-xs text-muted-foreground">
							{t("keywordHint")}
						</p>
					</div>
				) : (
					<div className="text-sm" data-testid="notes-display">
						{notes ? (
							<div className="whitespace-pre-wrap leading-relaxed">
								{highlightKeywords(notes)}
							</div>
						) : (
							<p className="text-muted-foreground italic">{t("empty")}</p>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export default MissionNotesSection;
