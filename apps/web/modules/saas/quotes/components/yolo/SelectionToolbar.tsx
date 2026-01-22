"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@ui/components/alert-dialog";
import { Button } from "@ui/components/button";
import { cn } from "@ui/lib";
import { CopyIcon, EditIcon, Trash2Icon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface SelectionToolbarProps {
	selectedCount: number;
	onDelete: () => void;
	onDuplicate: () => void;
	onEdit?: () => void; // Only available when exactly one line is selected
	onDeselect: () => void;
	className?: string;
}

export function SelectionToolbar({
	selectedCount,
	onDelete,
	onDuplicate,
	onEdit,
	onDeselect,
	className,
}: SelectionToolbarProps) {
	const t = useTranslations("quotes.yolo");
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	const handleDeleteClick = () => {
		setShowDeleteConfirm(true);
	};

	const handleDeleteConfirm = () => {
		onDelete();
		setShowDeleteConfirm(false);
	};

	if (selectedCount === 0) {
		return null;
	}

	return (
		<>
			{/* Story 26.20: Enhanced glassmorphism floating toolbar */}
			<div
				className={cn(
					"-translate-x-1/2 fixed bottom-6 left-1/2 z-50",
					"flex items-center gap-3 rounded-2xl px-5 py-3",
					// Glassmorphism effects
					"border border-white/30 bg-white/85 shadow-2xl backdrop-blur-xl",
					"dark:border-slate-600/40 dark:bg-slate-900/85",
					// Subtle gradient overlay
					"bg-gradient-to-r from-white/90 to-white/70 dark:from-slate-900/90 dark:to-slate-800/80",
					// Entry animation
					"fade-in slide-in-from-bottom-4 animate-in duration-300",
					className,
				)}
			>
				{/* Selection count badge */}
				<div className="flex items-center gap-2 border-r pr-3">
					<span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 font-medium text-primary-foreground text-xs">
						{selectedCount}
					</span>
					<span className="text-muted-foreground text-sm">
						{t("selection.selected") ||
							`ligne${selectedCount > 1 ? "s" : ""} sélectionnée${selectedCount > 1 ? "s" : ""}`}
					</span>
				</div>

				{/* Actions */}
				<div className="flex items-center gap-1">
					{/* Edit button - only show when exactly one line is selected and edit handler is provided */}
					{selectedCount === 1 && onEdit && (
						<Button
							variant="ghost"
							size="sm"
							onClick={onEdit}
							className="gap-2"
							aria-label={t("actions.edit") || "Éditer"}
						>
							<EditIcon className="h-4 w-4" />
							<span className="hidden sm:inline">
								{t("actions.edit") || "Éditer"}
							</span>
						</Button>
					)}

					<Button
						variant="ghost"
						size="sm"
						onClick={onDuplicate}
						className="gap-2"
					>
						<CopyIcon className="h-4 w-4" />
						<span className="hidden sm:inline">
							{t("actions.duplicate") || "Dupliquer"}
						</span>
					</Button>

					<Button
						variant="ghost"
						size="sm"
						onClick={handleDeleteClick}
						className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
					>
						<Trash2Icon className="h-4 w-4" />
						<span className="hidden sm:inline">
							{t("actions.delete") || "Supprimer"}
						</span>
					</Button>
				</div>

				{/* Deselect button */}
				<Button
					variant="ghost"
					size="icon"
					onClick={onDeselect}
					className="ml-1 h-8 w-8 rounded-full"
				>
					<XIcon className="h-4 w-4" />
					<span className="sr-only">
						{t("actions.deselect") || "Désélectionner"}
					</span>
				</Button>
			</div>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{t("delete.confirmTitle") || "Confirmer la suppression"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t("delete.confirmMessage", { count: selectedCount }) ||
								`Êtes-vous sûr de vouloir supprimer ${selectedCount} ligne${selectedCount > 1 ? "s" : ""} ?`}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>
							{t("actions.cancel") || "Annuler"}
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteConfirm}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{t("actions.delete") || "Supprimer"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

export default SelectionToolbar;
