"use client";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import { InlineInput } from "@ui/components/inline-input";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@ui/components/tooltip";
import { useToast } from "@ui/hooks/use-toast";
import { cn } from "@ui/lib";
import { Checkbox } from "@ui/components/checkbox";
import {
	ChevronDownIcon,
	ChevronRightIcon,
	FolderIcon,
	GripVerticalIcon,
	LinkIcon,
	MoreVerticalIcon,
	UnlinkIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useRef, useState } from "react";
import {
	type BlockTemplate,
	useBlockTemplateActions,
} from "../../hooks/useBlockTemplateActions";
import { SlashMenu, type SlashMenuBlockType } from "../SlashMenu";
import { DetachWarningModal } from "./DetachWarningModal";
import {
	getOriginalLabelFromSource,
	isSensitiveField,
	isSignificantLabelChange,
} from "./detach-utils";

/** Line item type enum matching Prisma schema */
export type LineItemType = "CALCULATED" | "MANUAL" | "GROUP";

/** Display data structure for line items */
export interface DisplayData {
	label: string;
	description?: string;
	quantity: number;
	unitPrice: number;
	vatRate: number;
	total: number;
}

/** Source data structure (operational truth) */
export interface SourceData {
	origin?: string;
	destination?: string;
	distance?: number;
	duration?: number;
	basePrice?: number;
	internalCost?: number;
	pickupAt?: string;
	dropoffAt?: string;
	[key: string]: unknown;
}

/** Pending change state for detach confirmation */
interface PendingDetachChange {
	fieldName: string;
	originalValue: string;
	newValue: string;
}

/** Props for UniversalLineItemRow */
export interface UniversalLineItemRowProps {
	/** Unique identifier */
	id: string;
	/** Line type: CALCULATED, MANUAL, or GROUP */
	type: LineItemType;
	/** Display data (editable by user) */
	displayData: DisplayData;
	/** Source data (operational truth, readonly) */
	sourceData?: SourceData | null;
	/** Nesting depth (0 = root, 1 = inside group) */
	depth?: number;
	/** Whether the line is expanded (for GROUP type) */
	isExpanded?: boolean;
	/** Whether the row is being dragged */
	isDragging?: boolean;
	/** Whether the row is selected (Story 26.19) */
	isSelected?: boolean;
	/** Whether editing is disabled */
	disabled?: boolean;
	/** Currency code for price formatting */
	currency?: string;
	/** Callback when display data changes */
	onDisplayDataChange?: (
		field: keyof DisplayData,
		value: string | number,
	) => void;
	/** Callback when expand/collapse is toggled */
	onToggleExpand?: () => void;
	/** Callback when the line should be detached from operational data */
	onDetach?: () => void;
	/** Callback to insert a new line (for slash commands) */
	onInsert?: (type: LineItemType, data?: Record<string, unknown>) => void;
	/** Drag handle props (from dnd-kit) */
	dragHandleProps?: Record<string, unknown>;
	/** Children rows (for GROUP type) */
	children?: React.ReactNode;
	/** Story 26.19: Callback when selection checkbox is toggled */
	onSelectionChange?: (id: string, shiftKey: boolean) => void;
	/** Story 26.19: Whether to show selection checkbox */
	showSelection?: boolean;
}

/**
 * Formats a numeric value as a localized currency string.
 * @param value - The numeric amount to format
 * @param currency - ISO 4217 currency code (default: "EUR")
 * @returns Formatted price string (e.g., "85,00 €")
 */
function formatPrice(value: number, currency = "EUR"): string {
	return value.toLocaleString("fr-FR", {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
	});
}

/**
 * Formats a number for display with French locale.
 * @param value - The numeric value to format
 * @returns Formatted number string with up to 2 decimal places
 */
function formatNumber(value: number): string {
	return value.toLocaleString("fr-FR", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	});
}

/**
 * Indentation size in pixels per depth level.
 * Set to 24px to align with 8px design grid (3 × 8 = 24).
 * This provides clear visual hierarchy for nested groups.
 */
const INDENT_SIZE_PX = 24;

/**
 * Removes trailing slash from label (used by slash commands).
 * @param label - The label string to clean
 * @returns Label without trailing slash, trimmed
 */
function cleanSlashFromLabel(label: string): string {
	return label.replace(/\/$/, "").trim();
}

export function UniversalLineItemRow({
	id,
	type,
	displayData,
	sourceData,
	depth = 0,
	isExpanded = true,
	isDragging = false,
	isSelected = false,
	disabled = false,
	currency = "EUR",
	onDisplayDataChange,
	onToggleExpand,
	onDetach,
	onInsert,
	dragHandleProps,
	children,
	onSelectionChange,
	showSelection = false,
}: UniversalLineItemRowProps) {
	const t = useTranslations();
	const { toast } = useToast();
	const [isHovered, setIsHovered] = useState(false);
	const [isDetachModalOpen, setIsDetachModalOpen] = useState(false);
	const [pendingChange, setPendingChange] =
		useState<PendingDetachChange | null>(null);

	// Slash Menu State
	const [slashMenuOpen, setSlashMenuOpen] = useState(false);
	const [slashAnchorRect, setSlashAnchorRect] = useState<DOMRect | null>(null);

	// Template actions
	const { createTemplate } = useBlockTemplateActions();

	// Track the original label from sourceData for significant change detection
	const originalLabelFromSource = useMemo(
		() =>
			getOriginalLabelFromSource(sourceData as Record<string, unknown> | null),
		[sourceData],
	);

	// Track if we've already shown the label warning this session
	const labelWarningShownRef = useRef(false);

	// Determine if this line is "linked" (has source data)
	const isLinked =
		type === "CALCULATED" && sourceData !== null && sourceData !== undefined;

	/**
	 * Handles field changes with detach logic for CALCULATED lines
	 */
	const handleFieldChange = useCallback(
		(field: keyof DisplayData) => (value: string) => {
			// For CALCULATED lines, check if this is a sensitive change
			if (isLinked && onDetach) {
				// Check for sensitive field changes that require confirmation
				if (isSensitiveField(field)) {
					const originalValue = String(displayData[field] ?? "");
					const newValue = value;

					if (originalValue !== newValue) {
						// Store pending change and show modal
						setPendingChange({
							fieldName: field,
							originalValue,
							newValue,
						});
						setIsDetachModalOpen(true);
						return; // Don't apply change yet
					}
				}

				// Check for significant label changes (warning only, no detach)
				if (field === "label" && !labelWarningShownRef.current) {
					if (
						isSignificantLabelChange(
							originalLabelFromSource || displayData.label,
							value,
						)
					) {
						toast({
							title:
								t("quotes.yolo.detach.labelWarningTitle") || "Label Modified",
							description:
								t("quotes.yolo.detach.labelWarning") ||
								"You've significantly modified the label. The operational data remains unchanged.",
							variant: "default",
						});
						labelWarningShownRef.current = true;
					}
				}
			}

			// Story 26.8: Handle Slash Command trigger
			if (field === "label" && value.endsWith("/")) {
				// Need to find the input element to position the menu
				// Since InlineInput abstracts the input, we might need a ref or try to find active element
				// For now, simpler approach: current mouse position or just centering
				// Better: InlineInput should expose ref, but we can assume focus is on input
				const activeEl = document.activeElement;
				if (activeEl && activeEl.tagName === "INPUT") {
					setSlashAnchorRect(activeEl.getBoundingClientRect());
				}
				// Always open if ends with slash, even if positioning fails (fallback to 0,0)
				setSlashMenuOpen(true);
			} else {
				setSlashMenuOpen(false);
			}

			// Apply the change normally
			if (onDisplayDataChange) {
				if (
					field === "quantity" ||
					field === "unitPrice" ||
					field === "vatRate" ||
					field === "total"
				) {
					const numValue = Number.parseFloat(value.replace(",", ".")) || 0;
					const sanitizedValue = Math.max(0, numValue);
					onDisplayDataChange(field, sanitizedValue);
				} else {
					onDisplayDataChange(field, value);
				}
			}
		},
		[
			onDisplayDataChange,
			isLinked,
			onDetach,
			displayData,
			originalLabelFromSource,
			t,
			toast,
		],
	);

	/**
	 * Handle slash menu selection
	 */
	const handleSlashSelect = useCallback(
		(type: SlashMenuBlockType) => {
			// Remove trailing slash
			const newLabel = cleanSlashFromLabel(displayData.label);

			if (onDisplayDataChange) {
				onDisplayDataChange("label", newLabel);
			}

			if (onInsert) {
				// Map SlashMenu type to LineItemType
				let mappedType: LineItemType = "MANUAL";
				if (type === "CALCULATED") mappedType = "CALCULATED"; // Should trigger service selection in theory
				if (type === "GROUP") mappedType = "GROUP";

				if (type === "DISCOUNT") {
					// Special handling for discount
					onInsert("MANUAL", {
						label: "Discount",
						description: "Applied discount",
						quantity: 1,
						unitPrice: -10, // Example default
						vatRate: 0,
					});
				} else {
					onInsert(mappedType);
				}
			}

			setSlashMenuOpen(false);
		},
		[displayData.label, onDisplayDataChange, onInsert],
	);

	/**
	 * Handle template selection
	 */
	const handleTemplateSelect = useCallback(
		(template: BlockTemplate) => {
			// Remove trailing slash
			const newLabel = cleanSlashFromLabel(displayData.label);

			if (onDisplayDataChange) {
				onDisplayDataChange("label", newLabel);
			}

			if (onInsert) {
				// Flatten data mixed structure if needed, but here we assume template.data matches structure
				onInsert("MANUAL", {
					...template.data,
					label: template.label, // Use template name as default label? Or data.label? Story says "Insert Template"
				});
			}
			setSlashMenuOpen(false);
		},
		[displayData.label, onDisplayDataChange, onInsert],
	);

	/**
	 * Handle "Save as Template"
	 */
	const handleSaveTemplate = async () => {
		try {
			// Extract relevant data
			const templateData = {
				unitPrice: displayData.unitPrice,
				quantity: displayData.quantity,
				vatRate: displayData.vatRate,
				description: displayData.description,
				// If calculated, we might want to save source specifics? Story says "common text blocks", implies MANUAL primarily.
				// But AC2 says "Given a Manually Typed or Calculated block"
				// Storing sourceData might be tricky if it has specific dates/IDs.
				// We'll store basic pricing + labels.
			};

			await createTemplate({
				label: displayData.label || "Untitled Template",
				data: templateData,
			});
		} catch (error) {
			console.error("Failed to save template", error);
			toast({
				title: t("quotes.yolo.template.errorTitle") || "Error",
				description:
					t("quotes.yolo.template.errorSaving") ||
					"Failed to save template. Please try again.",
				variant: "error",
			});
		}
	};

	/**
	 * Handle detach confirmation from modal
	 */
	const handleDetachConfirm = useCallback(() => {
		if (onDetach) {
			onDetach();
			toast({
				title: t("quotes.yolo.detach.successTitle") || "Line Detached",
				description:
					t("quotes.yolo.detach.success") ||
					"Line detached from operational route",
				variant: "default",
			});
		}

		// Apply the pending change after detach
		if (pendingChange && onDisplayDataChange) {
			const { fieldName, newValue } = pendingChange;
			if (
				fieldName === "quantity" ||
				fieldName === "unitPrice" ||
				fieldName === "vatRate" ||
				fieldName === "total"
			) {
				const numValue = Number.parseFloat(newValue.replace(",", ".")) || 0;
				onDisplayDataChange(
					fieldName as keyof DisplayData,
					Math.max(0, numValue),
				);
			} else {
				onDisplayDataChange(fieldName as keyof DisplayData, newValue);
			}
		}

		setPendingChange(null);
	}, [onDetach, pendingChange, onDisplayDataChange, t, toast]);

	/**
	 * Handle cancel from detach modal
	 */
	const handleDetachCancel = useCallback(() => {
		setPendingChange(null);
		setIsDetachModalOpen(false);
	}, []);

	// Indentation based on depth
	const indentPadding = depth * INDENT_SIZE_PX;

	// Row background based on state
	const rowBackground = cn(
		"group flex items-center gap-2 px-2 py-1.5 border-b border-border/50 transition-colors relative",
		isDragging && "opacity-50 bg-muted",
		isSelected && "bg-primary/5 border-primary/20",
		isHovered && !isDragging && "bg-muted/30",
		type === "GROUP" && "bg-muted/20 font-medium",
	);

	// Story 26.19: Handle checkbox click with shift key detection
	const handleCheckboxClick = (e: React.MouseEvent) => {
		if (onSelectionChange) {
			onSelectionChange(id, e.shiftKey);
		}
	};

	// Render GROUP type (container/header)
	if (type === "GROUP") {
		return (
			<div className="relative" data-testid={`quote-line-${id}`}>
				<div
					className={rowBackground}
					style={{ paddingLeft: indentPadding + 8 }}
					onMouseEnter={() => setIsHovered(true)}
					onMouseLeave={() => setIsHovered(false)}
					data-testid={`quote-line-row-${id}`}
				>
					{/* Story 26.19: Selection checkbox */}
					{(showSelection || isSelected || isHovered) && onSelectionChange && (
						<div
							className="flex items-center justify-center"
							onClick={handleCheckboxClick}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									handleCheckboxClick(e as unknown as React.MouseEvent);
								}
							}}
						>
							<Checkbox
								checked={isSelected}
								className="h-4 w-4"
								aria-label={`Select ${displayData.label}`}
							/>
						</div>
					)}

					{/* Drag handle */}
					<div
						{...dragHandleProps}
						className="cursor-grab opacity-0 transition-opacity group-hover:opacity-100"
					>
						<GripVerticalIcon className="size-4 text-muted-foreground" />
					</div>

					{/* Expand/Collapse toggle */}
					<button
						type="button"
						onClick={onToggleExpand}
						className="rounded p-0.5 hover:bg-muted"
					>
						{isExpanded ? (
							<ChevronDownIcon className="size-4 text-muted-foreground" />
						) : (
							<ChevronRightIcon className="size-4 text-muted-foreground" />
						)}
					</button>

					{/* Group label */}
					<div className="flex-1">
						<InlineInput
							value={displayData.label}
							onChange={handleFieldChange("label")}
							placeholder={t("quotes.yolo.groupPlaceholder") || "Group name..."}
							disabled={disabled}
							fontWeight="semibold"
							className="text-sm"
						/>
					</div>

					{/* Group total */}
					<div className="w-24 text-right font-medium text-sm">
						{formatPrice(displayData.total, currency)}
					</div>

					{/* Actions Menu */}
					<div className="opacity-0 transition-opacity group-hover:opacity-100">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button type="button" className="rounded p-1 hover:bg-muted">
									<MoreVerticalIcon className="size-4 text-muted-foreground" />
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onClick={handleSaveTemplate}>
									<FolderIcon className="mr-2 size-4" />
									{t("quotes.actions.saveAsTemplate") || "Save as Template"}
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>

				{/* Children (nested lines) */}
				{isExpanded && children && (
					<div className="ml-4 border-muted border-l-2">{children}</div>
				)}

				<SlashMenu
					isOpen={slashMenuOpen}
					onClose={() => setSlashMenuOpen(false)}
					onSelect={handleSlashSelect}
					onTemplateSelect={handleTemplateSelect}
					anchorRect={slashAnchorRect}
				/>
			</div>
		);
	}

	// Render CALCULATED or MANUAL type
	return (
		<>
			<div
				className={rowBackground}
				style={{ paddingLeft: indentPadding + 8 }}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				data-testid={`quote-line-${id}`}
			>
				{/* Story 26.19: Selection checkbox */}
				{(showSelection || isSelected || isHovered) && onSelectionChange && (
					<div
						className="flex items-center justify-center"
						onClick={handleCheckboxClick}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								handleCheckboxClick(e as unknown as React.MouseEvent);
							}
						}}
					>
						<Checkbox
							checked={isSelected}
							className="h-4 w-4"
							aria-label={`Select ${displayData.label}`}
						/>
					</div>
				)}

				{/* Drag handle */}
				<div
					{...dragHandleProps}
					className="cursor-grab opacity-0 transition-opacity group-hover:opacity-100"
				>
					<GripVerticalIcon className="size-4 text-muted-foreground" />
				</div>

				{/* Link indicator */}
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<div className="w-5">
								{isLinked ? (
									<LinkIcon
										className="size-4 text-green-600"
										data-testid="link-icon"
									/>
								) : type === "MANUAL" ? (
									<UnlinkIcon
										className="size-4 text-muted-foreground"
										data-testid="unlink-icon"
									/>
								) : null}
							</div>
						</TooltipTrigger>
						<TooltipContent side="right">
							{isLinked
								? t("quotes.yolo.linkedToSource") || "Linked to pricing engine"
								: t("quotes.yolo.manualLine") || "Manual line (no source data)"}
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>

				{/* Label / Description */}
				<div className="min-w-[200px] flex-1">
					<InlineInput
						value={displayData.label}
						onChange={handleFieldChange("label")}
						placeholder={t("quotes.yolo.labelPlaceholder") || "Description..."}
						disabled={disabled}
						className="text-sm"
					/>
				</div>

				{/* Quantity */}
				<div className="w-16">
					<InlineInput
						value={formatNumber(displayData.quantity)}
						onChange={handleFieldChange("quantity")}
						type="number"
						disabled={disabled}
						align="right"
						className="text-sm"
						minWidth="2rem"
					/>
				</div>

				{/* Unit Price */}
				<div className="w-24">
					<InlineInput
						value={displayData.unitPrice.toFixed(2)}
						onChange={handleFieldChange("unitPrice")}
						type="number"
						disabled={disabled}
						align="right"
						className="text-sm"
						formatValue={(v) =>
							formatPrice(Number.parseFloat(v) || 0, currency)
						}
					/>
				</div>

				{/* VAT Rate */}
				<div className="w-16">
					<InlineInput
						value={displayData.vatRate.toString()}
						onChange={handleFieldChange("vatRate")}
						type="number"
						disabled={disabled}
						align="right"
						className="text-sm"
						formatValue={(v) => `${v}%`}
					/>
				</div>

				{/* Total (read-only, calculated) */}
				<div className="w-24 text-right font-medium text-sm">
					{formatPrice(displayData.total, currency)}
				</div>

				{/* Actions Menu */}
				<div className="opacity-0 transition-opacity group-hover:opacity-100">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button type="button" className="rounded p-1 hover:bg-muted">
								<MoreVerticalIcon className="size-4 text-muted-foreground" />
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={handleSaveTemplate}>
								<FolderIcon className="mr-2 size-4" />
								{t("quotes.actions.saveAsTemplate") || "Save as Template"}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			{/* Detach Warning Modal */}
			<DetachWarningModal
				isOpen={isDetachModalOpen}
				onClose={handleDetachCancel}
				onConfirm={handleDetachConfirm}
				fieldName={pendingChange?.fieldName}
				originalValue={pendingChange?.originalValue}
				newValue={pendingChange?.newValue}
			/>

			<SlashMenu
				isOpen={slashMenuOpen}
				onClose={() => setSlashMenuOpen(false)}
				onSelect={handleSlashSelect}
				onTemplateSelect={handleTemplateSelect}
				anchorRect={slashAnchorRect}
			/>
		</>
	);
}

export default UniversalLineItemRow;
