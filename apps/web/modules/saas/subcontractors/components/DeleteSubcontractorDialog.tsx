"use client";

/**
 * DeleteSubcontractorDialog Component
 * Story 22.4: Implement Complete Subcontracting System
 */

import { useTranslations } from "next-intl";
import { Loader2Icon, AlertTriangleIcon } from "lucide-react";
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
import { useToast } from "@ui/hooks/use-toast";
import { useDeleteSubcontractor } from "@saas/dispatch/hooks/useSubcontracting";
import type { SubcontractorListItem } from "../types";

interface DeleteSubcontractorDialogProps {
	isOpen: boolean;
	onClose: () => void;
	subcontractor: SubcontractorListItem;
}

export function DeleteSubcontractorDialog({
	isOpen,
	onClose,
	subcontractor,
}: DeleteSubcontractorDialogProps) {
	const t = useTranslations("subcontractors");
	const { toast } = useToast();

	const deleteMutation = useDeleteSubcontractor();

	const handleDelete = async () => {
		try {
			await deleteMutation.mutateAsync(subcontractor.id);

			toast({
				title: t("toast.deleteSuccess"),
			});

			onClose();
		} catch {
			toast({
				title: t("toast.error"),
				variant: "error",
			});
		}
	};

	const displayName = subcontractor.companyName;

	return (
		<AlertDialog open={isOpen} onOpenChange={onClose}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2">
						<AlertTriangleIcon className="size-5 text-destructive" />
						{t("dialog.deleteTitle")}
					</AlertDialogTitle>
					<AlertDialogDescription>
						{t("dialog.deleteDescription")}
						<span className="block mt-2 font-medium text-foreground">
							{displayName}
						</span>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{t("dialog.cancel")}</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleDelete}
						disabled={deleteMutation.isPending}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{deleteMutation.isPending && (
							<Loader2Icon className="size-4 mr-2 animate-spin" />
						)}
						{t("dialog.delete")}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
