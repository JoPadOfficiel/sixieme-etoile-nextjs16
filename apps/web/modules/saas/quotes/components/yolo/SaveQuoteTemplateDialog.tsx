"use client";
import { Button } from "@ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useBlockTemplateActions } from "../../hooks/useBlockTemplateActions";
import { serializeCartToTemplate } from "../../utils/cartTemplateUtils";
import type { QuoteLine } from "./dnd-utils";

interface SaveQuoteTemplateDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	lines: QuoteLine[];
}

export function SaveQuoteTemplateDialog({
	isOpen,
	onOpenChange,
	lines,
}: SaveQuoteTemplateDialogProps) {
	const t = useTranslations("quotes.templates");
	const [name, setName] = useState("");
	const { createFullQuoteTemplate, isCreating } = useBlockTemplateActions();

	const handleSave = async () => {
		if (!name.trim()) return;

		try {
			// Serialize cart to template structure
			const templateData = serializeCartToTemplate(lines);

			// Save to backend
			await createFullQuoteTemplate({
				label: name.trim(),
				data: templateData,
			});

			// Reset and close
			setName("");
			onOpenChange(false);
		} catch (error) {
			console.error("Failed to save template", error);
			// Toast handled by hook
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>
						{t("saveQuoteAsTemplate") || "Save quote as template"}
					</DialogTitle>
					<DialogDescription>
						{t("saveQuoteDescription") ||
							"Save the current quote structure to reuse it later."}
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-4">
					<div className="grid gap-2">
						<Label htmlFor="template-name">
							{t("templateName") || "Template name"}
						</Label>
						<Input
							id="template-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder={
								t("templateNamePlaceholder") || "e.g., Fashion Week Package"
							}
							disabled={isCreating}
							onKeyDown={(e) => {
								if (e.key === "Enter" && name.trim()) {
									handleSave();
								}
							}}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isCreating}
					>
						{t("cancel") || "Cancel"}
					</Button>
					<Button
						onClick={handleSave}
						disabled={!name.trim() || isCreating || lines.length === 0}
					>
						{isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						{t("save") || "Save"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
