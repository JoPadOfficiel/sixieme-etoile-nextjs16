"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { apiClient } from "@shared/lib/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@ui/components/button";
import { Skeleton } from "@ui/components/skeleton";
import { useToast } from "@ui/hooks/use-toast";
import { ArrowLeftIcon, Loader2Icon, SaveIcon, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useOptionalFees } from "../hooks/useOptionalFees";
import { usePricingCalculation } from "../hooks/usePricingCalculation";
import { useQuoteDetail } from "../hooks/useQuoteDetail";
import { useScenarioHelpers } from "../hooks/useScenarioHelpers";
import { useVehicleCategories } from "../hooks/useVehicleCategories";
import { useQuoteLinesStore } from "../stores/useQuoteLinesStore";
import type { CreateQuoteFormData } from "../types";
import { hasBlockingViolations, initialCreateQuoteFormData } from "../types";
import { hydrateFromQuote, type DatabaseQuoteLine } from "../utils/hydrateFromQuote";
import { lineToFormData } from "../utils/lineToFormData";
import type { AddedFee } from "./AddQuoteFeeDialog";
import { AirportHelperPanel } from "./AirportHelperPanel";
import { CapacityWarningAlert } from "./CapacityWarningAlert";
import { ComplianceAlertBanner } from "./ComplianceAlertBanner";
import { QuoteBasicInfoPanel } from "./QuoteBasicInfoPanel";
import { QuotePricingPanel } from "./QuotePricingPanel";
import { TripTransparencyPanel } from "./TripTransparencyPanel";
import { YoloQuoteEditor } from "./yolo/YoloQuoteEditor";
import type { QuoteLine } from "./yolo/dnd-utils";

interface EditQuoteCockpitProps {
	quoteId: string;
}

/**
 * EditQuoteCockpit Component
 *
 * Edit page for existing quotes in DRAFT status.
 * Now uses the same Shopping Cart (Yolo Mode) layout as CreateQuoteCockpit.
 *
 * @see Story 10.1: Quote Edit Functionality
 * @see Story 26.16: Yolo Mode Shopping Cart
 */
export function EditQuoteCockpit({ quoteId }: EditQuoteCockpitProps) {
	const t = useTranslations();
	const { toast } = useToast();
	const router = useRouter();
	const queryClient = useQueryClient();
	const { activeOrganization } = useActiveOrganization();

	// Fetch existing quote data
	const {
		data: quote,
		isLoading: quoteLoading,
		error: quoteError,
	} = useQuoteDetail(quoteId);

	// Form state - for configuring NEW items (current item being edited)
	const [formData, setFormData] = useState<CreateQuoteFormData>(
		initialCreateQuoteFormData,
	);
	const [isInitialized, setIsInitialized] = useState(false);

	// Added fees for the current item being configured
	const [addedFees, setAddedFees] = useState<AddedFee[]>([]);

	// Shopping Cart State (The list of lines) - initialized from existing quote lines
	const [quoteLines, setQuoteLines] = useState<QuoteLine[]>([]);

	// Story 29.3: Initialize form data and lines from quote with proper hydration
	useEffect(() => {
		if (quote && !isInitialized) {
			// Initialize form with quote data for adding new items
			setFormData({
				contactId: quote.contactId,
				contact: quote.contact,
				endCustomerId: quote.endCustomerId || null,
				endCustomer: quote.endCustomer || null,
				pricingMode: quote.pricingMode,
				pickupAddress: quote.pickupAddress,
				pickupLatitude: quote.pickupLatitude
					? Number.parseFloat(quote.pickupLatitude)
					: null,
				pickupLongitude: quote.pickupLongitude
					? Number.parseFloat(quote.pickupLongitude)
					: null,
				dropoffAddress: quote.dropoffAddress ?? "",
				dropoffLatitude: quote.dropoffLatitude
					? Number.parseFloat(quote.dropoffLatitude)
					: null,
				dropoffLongitude: quote.dropoffLongitude
					? Number.parseFloat(quote.dropoffLongitude)
					: null,
				pickupAt: quote.pickupAt ? new Date(quote.pickupAt) : null,
				tripType: quote.tripType,
				vehicleCategoryId: quote.vehicleCategoryId,
				vehicleCategory: quote.vehicleCategory || null,
				passengerCount: quote.passengerCount,
				luggageCount: quote.luggageCount,
				finalPrice: Number.parseFloat(quote.finalPrice),
				notes: quote.notes || "",
				validUntil: quote.validUntil ? new Date(quote.validUntil) : null,
				flightNumber: "",
				waitingTimeMinutes: 0,
				selectedOptionalFeeIds:
					(
						quote.appliedRules as {
							selectedOptionalFeeIds?: string[];
						} | null
					)?.selectedOptionalFeeIds ?? [],
				isRoundTrip: quote.isRoundTrip ?? false,
				stops:
					(quote.stops as
						| {
								id: string;
								address: string;
								latitude: number | null;
								longitude: number | null;
								order: number;
						  }[]
						| null) ?? [],
				returnDate: quote.returnDate ? new Date(quote.returnDate) : null,
				durationHours: quote.durationHours
					? Number.parseFloat(quote.durationHours)
					: null,
				maxKilometers: quote.maxKilometers
					? Number.parseFloat(quote.maxKilometers)
					: null,
				stayDays: [],
			});

			// Story 29.3: Hydrate quote lines using dedicated function with Zod validation
			if (quote.lines && quote.lines.length > 0) {
				const hydratedLines = hydrateFromQuote(quote.lines as DatabaseQuoteLine[]);
				setQuoteLines(hydratedLines);

				// Story 29.3: Sync with Zustand store for YoloQuoteEditor
				// This ensures the store is initialized with the correct lines
				// and clears history so we can't undo the initial hydration
				// Note: Direct setState is acceptable here for initial data hydration
				// as this is a one-time setup, not reactive state management
				useQuoteLinesStore.setState({ lines: hydratedLines });
				// Clear temporal history after initial hydration
				useQuoteLinesStore.temporal.getState().clear();
			}

			// Restore added fees from appliedRules
			const savedAddedFees =
				(quote.appliedRules as { addedFees?: AddedFee[] } | null)?.addedFees ??
				[];
			setAddedFees(savedAddedFees);

			setIsInitialized(true);
		}
	}, [quote, isInitialized]);

	// Pricing calculation for current item
	const { pricingResult, isCalculating, calculate } = usePricingCalculation({
		debounceMs: 500,
	});

	// Helpers
	const { categories: allVehicleCategories } = useVehicleCategories();
	const { fees: optionalFees } = useOptionalFees();
	const { airportDetection, capacityWarning, getApplicableFees } =
		useScenarioHelpers(formData, allVehicleCategories);
	const applicableFees = getApplicableFees(optionalFees, airportDetection);

	// Auto-select fees logic
	const previousAirportRef = useRef<boolean>(false);
	useEffect(() => {
		if (airportDetection.isAirportTransfer && !previousAirportRef.current) {
			const feeIds = applicableFees.map((f) => f.id);
			setFormData((prev) => {
				const currentIds = prev.selectedOptionalFeeIds || [];
				const isSame =
					feeIds.length === currentIds.length &&
					feeIds.every((id) => currentIds.includes(id));

				if (isSame) return prev;

				return {
					...prev,
					selectedOptionalFeeIds: feeIds,
				};
			});
		}
		previousAirportRef.current = airportDetection.isAirportTransfer;
	}, [airportDetection.isAirportTransfer, applicableFees]);

	// Recalculate when form changes
	useEffect(() => {
		if (isInitialized) {
			calculate(formData);
		}
	}, [
		calculate,
		isInitialized,
		formData.contactId,
		formData.pickupLatitude,
		formData.pickupLongitude,
		formData.dropoffLatitude,
		formData.dropoffLongitude,
		formData.vehicleCategoryId,
		formData.tripType,
		formData.pickupAt?.toISOString(),
		formData.passengerCount,
		formData.luggageCount,
		formData.isRoundTrip,
		formData.returnDate?.toISOString(),
		formData.durationHours,
		formData.maxKilometers,
		JSON.stringify(formData.stops),
	]);

	// Handler: Update form field
	const handleFormChange = useCallback(
		<K extends keyof CreateQuoteFormData>(
			field: K,
			value: CreateQuoteFormData[K],
		) => {
			setFormData((prev) => ({
				...prev,
				[field]: value,
			}));
		},
		[],
	);

	// Handler: Edit line - populate form with line data
	const handleEditLine = useCallback((line: QuoteLine) => {
		const lineFormData = lineToFormData(line);
		setFormData((prev) => ({
			...prev,
			...lineFormData,
		}));
	}, []);

	// Determine if blocking violations exist
	const violations = hasBlockingViolations(
		pricingResult?.complianceResult || null,
		pricingResult?.tripAnalysis?.compliancePlan,
	);

	// Helper: Create a line from current form state
	const createLineFromState = useCallback((): QuoteLine | null => {
		if (formData.finalPrice <= 0) {
			toast({
				title: t("quotes.create.validation.error"),
				description: t("quotes.create.validation.priceRequired"),
				variant: "error",
			});
			return null;
		}

		const tempId = crypto.randomUUID();
		return {
			id: tempId,
			type: "CALCULATED",
			label: `${formData.pickupAddress} ➝ ${formData.dropoffAddress || "Disposition"}`,
			description: formData.notes || undefined,
			quantity: 1,
			unitPrice: formData.finalPrice,
			totalPrice: formData.finalPrice,
			vatRate: 10,
			parentId: null,
			displayData: {
				pickupAddress: formData.pickupAddress,
				dropoffAddress: formData.dropoffAddress,
				pickupDate: formData.pickupAt,
				vehicleCategory: allVehicleCategories?.find(
					(c) => c.id === formData.vehicleCategoryId,
				)?.name,
				distance: pricingResult?.tripAnalysis?.totalDistanceKm,
				duration: pricingResult?.tripAnalysis?.totalDurationMinutes,
			},
			sourceData: {
				formData: { ...formData },
				pricingResult: { ...pricingResult },
			},
		};
	}, [formData, pricingResult, t, allVehicleCategories, toast]);

	// Handler: Add Current Item to Cart
	const handleAddItemToCart = useCallback(() => {
		const newLine = createLineFromState();
		if (newLine) {
			setQuoteLines((prev) => [...prev, newLine]);
			toast({
				title: t("quotes.create.addedToCart"),
				description: t("quotes.create.addedToCartDesc"),
			});
		}
	}, [createLineFromState, t, toast]);

	// Update quote mutation
	const updateQuoteMutation = useMutation({
		mutationFn: async () => {
			if (!formData.contactId) throw new Error("Contact required");

			// Get lines to submit
			let linesToSubmit = quoteLines;

			// If cart is empty, create line from current form data
			if (linesToSubmit.length === 0) {
				const implicitLine = createLineFromState();
				if (!implicitLine) throw new Error("Invalid line data");
				linesToSubmit = [implicitLine];
			}

			// Use first CALCULATED line for primary trip data (legacy fields)
			const primaryLine = linesToSubmit.find((l) => l.type === "CALCULATED");
			const primaryData = (
				primaryLine?.sourceData as { formData: CreateQuoteFormData }
			)?.formData;
			const finalFormData = primaryData || formData;

			const response = await apiClient.vtc.quotes[":id"].$patch({
				param: { id: quoteId },
				json: {
					contactId: finalFormData.contactId,
					pickupAddress: finalFormData.pickupAddress,
					pickupLatitude: finalFormData.pickupLatitude,
					pickupLongitude: finalFormData.pickupLongitude,
					dropoffAddress: finalFormData.dropoffAddress,
					dropoffLatitude: finalFormData.dropoffLatitude,
					dropoffLongitude: finalFormData.dropoffLongitude,
					pickupAt: finalFormData.pickupAt
						? finalFormData.pickupAt instanceof Date
							? finalFormData.pickupAt.toISOString()
							: String(finalFormData.pickupAt)
						: undefined,
					tripType: finalFormData.tripType as
						| "TRANSFER"
						| "EXCURSION"
						| "DISPO"
						| "OFF_GRID",
					vehicleCategoryId: finalFormData.vehicleCategoryId,
					passengerCount: finalFormData.passengerCount,
					luggageCount: finalFormData.luggageCount,
					pricingMode:
						finalFormData.pricingMode ||
						pricingResult?.pricingMode ||
						"DYNAMIC",
					finalPrice: linesToSubmit.reduce(
						(sum, l) => sum + (l.totalPrice ?? 0),
						0,
					),
					notes: finalFormData.notes || undefined,
					suggestedPrice: pricingResult?.price ?? finalFormData.finalPrice,
					internalCost: pricingResult?.internalCost ?? null,
					marginPercent: pricingResult?.marginPercent ?? null,
					tripAnalysis:
						(pricingResult?.tripAnalysis as unknown as Record<
							string,
							unknown
						> | null) ?? null,
					appliedRules: {
						rules: pricingResult?.appliedRules ?? [],
						selectedOptionalFeeIds: finalFormData.selectedOptionalFeeIds,
						addedFees: addedFees.map((fee) => ({
							id: fee.id,
							type: fee.type,
							name: fee.name,
							description: fee.description,
							amount: fee.amount,
							vatRate: fee.vatRate,
							discountType: fee.discountType,
							promoCode: fee.promoCode,
							quantity: fee.quantity,
						})),
					},
					// Send lines for Yolo mode update
					lines: linesToSubmit,
					isYoloMode: true,
				} as any,
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(
					(error as { message?: string }).message || "Failed to update quote",
				);
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["quotes"] });
			queryClient.invalidateQueries({ queryKey: ["quote", quoteId] });
			toast({
				title: t("quotes.edit.success"),
				description: t("quotes.edit.successDescription"),
			});
			router.push(`/app/${activeOrganization?.slug}/quotes/${quoteId}`);
		},
		onError: (error) => {
			toast({
				title: t("quotes.edit.error"),
				description: error.message,
				variant: "error",
			});
		},
	});

	// Handler: Save Quote
	const handleSaveQuote = () => {
		updateQuoteMutation.mutate();
	};

	// Loading state
	if (quoteLoading) {
		return <EditQuoteSkeleton />;
	}

	// Error state
	if (quoteError || !quote) {
		return (
			<div className="py-4">
				<div className="text-center">
					<h1 className="font-bold text-2xl text-destructive">
						{t("quotes.detail.notFound")}
					</h1>
					<p className="mt-2 text-muted-foreground">
						{t("quotes.detail.notFoundDescription")}
					</p>
				</div>
			</div>
		);
	}

	// Check if quote is editable (only DRAFT)
	if (quote.status !== "DRAFT") {
		return (
			<div className="py-4">
				<div className="text-center">
					<h1 className="font-bold text-2xl text-destructive">
						{t("quotes.edit.notEditable")}
					</h1>
					<p className="mt-2 text-muted-foreground">
						{t("quotes.edit.notEditableDescription")}
					</p>
					<Link
						href={`/app/${activeOrganization?.slug}/quotes/${quoteId}`}
						className="mt-4 inline-flex items-center gap-1 text-primary text-sm hover:underline"
					>
						<ArrowLeftIcon className="size-4" />
						{t("quotes.detail.backToQuotes")}
					</Link>
				</div>
			</div>
		);
	}

	// Form not initialized yet
	if (!isInitialized) {
		return <EditQuoteSkeleton />;
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-2">
					<Link
						href={`/app/${activeOrganization?.slug}/quotes/${quoteId}`}
						className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
					>
						<ArrowLeftIcon className="size-4" />
						{t("quotes.edit.backToDetail")}
					</Link>
					<h1 className="font-bold text-2xl">
						{t("quotes.edit.title")} #{quoteId.substring(0, 8)}
					</h1>
					<p className="text-muted-foreground text-sm">
						{quote.contact.displayName}
					</p>
				</div>
				<Button
					onClick={handleSaveQuote}
					disabled={updateQuoteMutation.isPending || violations}
				>
					{updateQuoteMutation.isPending ? (
						<Loader2Icon className="mr-2 size-4 animate-spin" />
					) : (
						<SaveIcon className="mr-2 size-4" />
					)}
					{t("quotes.edit.save")}
				</Button>
			</div>

			{/* Blocking Alert Banner */}
			{pricingResult?.complianceResult && violations && (
				<ComplianceAlertBanner
					violations={pricingResult.complianceResult.violations}
					className="mb-2"
				/>
			)}

			{/* 3-Column Layout */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
				{/* LEFT COLUMN: Basic Info (Form) */}
				<div className="space-y-6 pr-2 lg:col-span-4">
					<QuoteBasicInfoPanel
						formData={formData}
						onFormChange={handleFormChange}
						allCategories={allVehicleCategories || []}
						disabled={updateQuoteMutation.isPending}
					/>

					{/* Helpers & Alerts */}
					{airportDetection.isAirportTransfer && (
						<AirportHelperPanel
							airportDetection={airportDetection}
							flightNumber={formData.flightNumber || ""}
							onFlightNumberChange={(value) =>
								handleFormChange("flightNumber", value)
							}
							waitingTimeMinutes={formData.waitingTimeMinutes || 0}
							onWaitingTimeChange={(value) =>
								handleFormChange("waitingTimeMinutes", value)
							}
							applicableFees={applicableFees}
							selectedFeeIds={formData.selectedOptionalFeeIds || []}
							onFeeToggle={(feeId, checked) => {
								const currentIds = formData.selectedOptionalFeeIds || [];
								const newIds = checked
									? [...currentIds, feeId]
									: currentIds.filter((id) => id !== feeId);
								handleFormChange("selectedOptionalFeeIds", newIds);
							}}
							disabled={updateQuoteMutation.isPending}
						/>
					)}
					{capacityWarning && (
						<CapacityWarningAlert
							warning={capacityWarning}
							currentCategoryName={
								allVehicleCategories?.find(
									(c) => c.id === formData.vehicleCategoryId,
								)?.name || ""
							}
							onApplySuggestion={() => {
								if (capacityWarning.suggestedCategory) {
									handleFormChange(
										"vehicleCategoryId",
										capacityWarning.suggestedCategory.id,
									);
								}
							}}
							disabled={updateQuoteMutation.isPending}
						/>
					)}
				</div>

				{/* CENTER COLUMN: Trip Transparency (Details) */}
				<div className="space-y-6 px-2 lg:col-span-4">
					<TripTransparencyPanel
						pricingResult={pricingResult}
						isLoading={isCalculating}
						encodedPolyline={pricingResult?.tripAnalysis?.encodedPolyline}
						routeCoordinates={{
							pickup:
								formData.pickupLatitude && formData.pickupLongitude
									? {
											lat: formData.pickupLatitude,
											lng: formData.pickupLongitude,
											address: formData.pickupAddress,
										}
									: undefined,
							dropoff:
								formData.dropoffLatitude && formData.dropoffLongitude
									? {
											lat: formData.dropoffLatitude,
											lng: formData.dropoffLongitude,
											address: formData.dropoffAddress || "",
										}
									: undefined,
						}}
					/>
				</div>

				{/* RIGHT COLUMN: Pricing & Cart */}
				<div className="flex flex-col border-l pl-2 lg:col-span-4">
					{/* 1. Pricing of CURRENT item + Add to Cart */}
					<div>
						<QuotePricingPanel
							formData={formData}
							pricingResult={pricingResult}
							isCalculating={isCalculating}
							isSubmitting={false}
							onFormChange={handleFormChange}
							onSubmit={handleAddItemToCart}
							hideSubmit={true}
							submitLabel={t("quotes.create.addToCart")}
							addedFees={addedFees}
							onAddFee={(fee) => setAddedFees([...addedFees, fee])}
							onRemoveFee={(id) =>
								setAddedFees(addedFees.filter((f) => f.id !== id))
							}
							onUpdateFee={(id, qty) =>
								setAddedFees(
									addedFees.map((f) =>
										f.id === id ? { ...f, quantity: qty } : f,
									),
								)
							}
							hasBlockingViolations={violations}
						/>
					</div>

					{/* 2. Shopping Cart: List of items + Global Save */}
					<div className="flex-1 border-t pt-4">
						<h3 className="mb-2 flex items-center gap-2 px-1 font-semibold">
							<Sparkles className="h-4 w-4 text-primary" />
							{t("quotes.yolo.linesEditor") || "Shopping Cart"}
						</h3>

						<div>
							<YoloQuoteEditor
								initialLines={quoteLines}
								onChange={setQuoteLines}
								readOnly={updateQuoteMutation.isPending}
								currency="EUR"
								onEditLine={handleEditLine}
							/>
						</div>

						{/* Global Save Button - Sticky at bottom */}
						<div className="sticky bottom-0 z-10 mt-4 border-t bg-background pt-4">
							<div className="mb-2 flex items-center justify-between px-1">
								<span className="text-muted-foreground text-sm">
									{t("quotes.edit.totalQuote") || "Total Quote"}
								</span>
								<span className="font-semibold">
									{quoteLines
										.reduce((sum, l) => sum + (l.totalPrice ?? 0), 0)
										.toFixed(2)}{" "}
									€
								</span>
							</div>
							<Button
								size="lg"
								className="w-full"
								onClick={handleSaveQuote}
								disabled={updateQuoteMutation.isPending}
							>
								{updateQuoteMutation.isPending && (
									<Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
								)}
								{t("quotes.edit.save")}
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

/**
 * Skeleton loading state for edit quote
 */
function EditQuoteSkeleton() {
	return (
		<div className="space-y-6 py-4">
			<div className="space-y-2">
				<Skeleton className="h-4 w-32" />
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-4 w-48" />
			</div>
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<div className="space-y-4">
					<Skeleton className="h-48 w-full" />
					<Skeleton className="h-32 w-full" />
				</div>
				<div>
					<Skeleton className="h-96 w-full" />
				</div>
				<div>
					<Skeleton className="h-64 w-full" />
				</div>
			</div>
		</div>
	);
}

export default EditQuoteCockpit;
