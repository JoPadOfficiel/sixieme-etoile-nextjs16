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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import { ScrollArea } from "@ui/components/scroll-area";
import { cn } from "@ui/lib";
import {
	FileText,
	FolderInput,
	Loader2,
	PlusCircle,
	RefreshCw,
	Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
	type BlockTemplate,
	useBlockTemplateActions,
} from "../../hooks/useBlockTemplateActions";
import {
	type FullQuoteTemplateData,
	deserializeTemplateToCart,
	isValidFullQuoteTemplate,
} from "../../utils/cartTemplateUtils";
import type { QuoteLine } from "./dnd-utils";

interface LoadQuoteTemplateDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	/** To calculate startSortOrder for appending */
	currentLinesCount: number;
	/** Callback to update lines in parent */
	onLoadLines: (lines: QuoteLine[], mode: "replace" | "append") => void;
}

export function LoadQuoteTemplateDialog({
	isOpen,
	onOpenChange,
	currentLinesCount,
	onLoadLines,
}: LoadQuoteTemplateDialogProps) {
	const t = useTranslations("quotes.templates");
	const { fullQuoteTemplates, isLoadingFullQuote, deleteTemplate, isDeleting } =
		useBlockTemplateActions();

	// Selected template state
	const [selectedTemplate, setSelectedTemplate] =
		useState<BlockTemplate | null>(null);

	// Confirmation dialog state
	const [confirmMode, setConfirmMode] = useState<"replace" | "append" | null>(
		null,
	);

	// Delete confirmation
	const [deleteId, setDeleteId] = useState<string | null>(null);

	const handleSelectTemplate = (template: BlockTemplate) => {
		setSelectedTemplate(template);
	};

	const handleLoad = (mode: "replace" | "append") => {
		if (!selectedTemplate) return;

		try {
			const data = selectedTemplate.data;
			if (!isValidFullQuoteTemplate(data)) {
				console.error("Invalid template format", data);
				return;
			}

			const startOrder = mode === "append" ? currentLinesCount : 0;
			const newLines = deserializeTemplateToCart(
				data as FullQuoteTemplateData,
				startOrder,
			);

			onLoadLines(newLines, mode);
			onOpenChange(false);
			setSelectedTemplate(null);
			setConfirmMode(null);
		} catch (error) {
			console.error("Failed to load template", error);
		}
	};

	const handleDelete = async () => {
		if (deleteId) {
			await deleteTemplate(deleteId);
			setDeleteId(null);
			if (selectedTemplate?.id === deleteId) {
				setSelectedTemplate(null);
			}
		}
	};

	return (
		<>
			<Dialog open={isOpen} onOpenChange={onOpenChange}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>
							{t("loadTemplate") || "Load Quote Template"}
						</DialogTitle>
						<DialogDescription>
							{t("loadTemplateDescription") ||
								"Select a saved quote structure to load."}
						</DialogDescription>
					</DialogHeader>

					<div className="flex h-[400px] gap-4">
						{/* Left: Template List */}
						<div className="w-1/2 border-r pr-4">
							<ScrollArea className="h-full">
								{isLoadingFullQuote ? (
									<div className="flex h-full items-center justify-center">
										<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
									</div>
								) : fullQuoteTemplates.length === 0 ? (
									<div className="flex h-full flex-col items-center justify-center p-4 text-center text-muted-foreground text-sm">
										<FolderInput className="mb-2 h-8 w-8 opacity-50" />
										<p>
											{t("noFullQuoteTemplates") ||
												"No quote templates saved yet."}
										</p>
									</div>
								) : (
									<div className="space-y-2">
										{fullQuoteTemplates.map((template) => (
											<div
												key={template.id}
												className={cn(
													"group flex items-center justify-between rounded-md border text-sm transition-colors",
													selectedTemplate?.id === template.id
														? "border-primary/50 bg-accent text-accent-foreground"
														: "border-transparent hover:bg-muted/50",
												)}
											>
												<button
													type="button"
													className="flex flex-1 items-center gap-3 overflow-hidden p-3 text-left outline-none"
													onClick={() => handleSelectTemplate(template)}
												>
													<FileText className="h-4 w-4 shrink-0 opacity-70" />
													<span className="truncate font-medium">
														{template.label}
													</span>
												</button>
												<Button
													variant="ghost"
													size="icon"
													className="mr-2 h-6 w-6 shrink-0 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
													onClick={(e) => {
														e.stopPropagation();
														setDeleteId(template.id);
													}}
												>
													<Trash2 className="h-3 w-3" />
												</Button>
											</div>
										))}
									</div>
								)}
							</ScrollArea>
						</div>

						{/* Right: Preview & Actions */}
						<div className="flex w-1/2 flex-col">
							{selectedTemplate ? (
								<>
									<div className="flex-1">
										<h3 className="mb-2 font-semibold text-lg">
											{selectedTemplate.label}
										</h3>
										<p className="mb-4 text-muted-foreground text-xs">
											{t("templateContent") || "Contains:"}
										</p>
										<div className="space-y-1">
											{isValidFullQuoteTemplate(selectedTemplate.data) &&
												selectedTemplate.data.lines
													.slice(0, 5)
													.map((line, i) => (
														<div
															key={i}
															className="flex items-center gap-2 text-muted-foreground text-sm"
														>
															<span className="h-1 w-1 rounded-full bg-primary/50" />
															<span className="truncate">{line.label}</span>
															{line.type === "GROUP" && (
																<span className="rounded bg-muted px-1 text-[10px]">
																	GRP
																</span>
															)}
														</div>
													))}
											{isValidFullQuoteTemplate(selectedTemplate.data) &&
												selectedTemplate.data.lines.length > 5 && (
													<p className="pt-2 text-muted-foreground text-xs">
														+ {selectedTemplate.data.lines.length - 5}{" "}
														{t("moreItems") || "more items..."}
													</p>
												)}
										</div>
									</div>

									<div className="my-4 h-px w-full bg-border" />

									<div className="space-y-3">
										<p className="font-medium text-sm">
											{t("loadAction") || "How strictly to load?"}
										</p>

										<Button
											variant="default"
											className="w-full justify-start"
											onClick={() =>
												currentLinesCount > 0
													? setConfirmMode("replace")
													: handleLoad("replace")
											}
										>
											<RefreshCw className="mr-2 h-4 w-4" />
											{t("replaceCart") || "Replace current cart"}
										</Button>

										<Button
											variant="secondary"
											className="w-full justify-start"
											onClick={() => handleLoad("append")}
										>
											<PlusCircle className="mr-2 h-4 w-4" />
											{t("addToCart") || "Add to current cart"}
										</Button>
									</div>
								</>
							) : (
								<div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
									{t("selectTemplateToPreview") ||
										"Select a template to preview"}
								</div>
							)}
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Replace Confirmation Alert */}
			<AlertDialog
				open={confirmMode === "replace"}
				onOpenChange={(open) => !open && setConfirmMode(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{t("confirmReplaceTitle") || "Replace entire cart?"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t("confirmReplaceDescription") ||
								"This will remove all current items in the cart and replace them with the template contents. This action cannot be undone."}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t("cancel") || "Cancel"}</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => handleLoad("replace")}
							className="bg-destructive hover:bg-destructive/90"
						>
							{t("confirmReplace") || "Yes, replace it"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Delete Confirmation Alert */}
			<AlertDialog
				open={!!deleteId}
				onOpenChange={(open) => !open && setDeleteId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{t("deleteTemplateTitle") || "Delete template?"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t("deleteTemplateDescription") ||
								"Are you sure you want to delete this quote template? This cannot be undone."}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t("cancel") || "Cancel"}</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive hover:bg-destructive/90"
							disabled={isDeleting}
						>
							{isDeleting ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								t("delete") || "Delete"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
