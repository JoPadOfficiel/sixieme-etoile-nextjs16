"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { apiClient } from "@shared/lib/api-client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@ui/components/button";
import {} from "@ui/components/card";
import { useToast } from "@ui/hooks/use-toast";
import { Loader2Icon, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOptionalFees } from "../hooks/useOptionalFees";
import { usePricingCalculation } from "../hooks/usePricingCalculation";
import { useScenarioHelpers } from "../hooks/useScenarioHelpers";
import { useVehicleCategories } from "../hooks/useVehicleCategories";
import { useQuoteLinesStore } from "../stores/useQuoteLinesStore";
import type { CreateQuoteFormData } from "../types";
import { hasBlockingViolations, initialCreateQuoteFormData } from "../types";
import type { AddedFee } from "./AddQuoteFeeDialog";
import { AirportHelperPanel } from "./AirportHelperPanel";
import { CapacityWarningAlert } from "./CapacityWarningAlert";
import { ComplianceAlertBanner } from "./ComplianceAlertBanner";
import { QuoteBasicInfoPanel } from "./QuoteBasicInfoPanel";
import { QuotePricingPanel } from "./QuotePricingPanel";
import { TripTransparencyPanel } from "./TripTransparencyPanel";
import UniversalLineItemRow from "./yolo/UniversalLineItemRow";
import { YoloQuoteEditor } from "./yolo/YoloQuoteEditor";
import type { QuoteLine } from "./yolo/dnd-utils";

/**
 * CreateQuoteCockpit Component
 *
 * Main 3-column layout for quote creation with Integrated Yolo Mode (Shopping Cart).
 *
 * Layout:
 * - Left: Basic info (Form Configuration)
 * - Center: Trip Transparency (Details of CURRENT item being configured)
 * - Right:
 *      1. Pricing Panel (Price of CURRENT item + Add to Cart)
 *      2. Shopping Cart (List of items + Global Save)
 *
 * Story 26.16: "Yolo Mode" is now the standard "Shopping Cart" workflow.
 * Story 26.18 & User Feedback: Reintegrated TripTransparencyPanel for detailed breakdown.
 */
export function CreateQuoteCockpit() {
	const t = useTranslations();
	const { toast } = useToast();
	const router = useRouter();
	const { activeOrganization } = useActiveOrganization();

	// Form state (Represents the "Current Item" being configured)
	const [formData, setFormData] = useState<CreateQuoteFormData>(
		initialCreateQuoteFormData,
	);

	// Added fees for the current item
	const [addedFees, setAddedFees] = useState<AddedFee[]>([]);

	// Shopping Cart State (The list of committed lines)
	const [quoteLines, setQuoteLines] = useState<QuoteLine[]>([]);

	// Preview line ID for the current item being configured (constant to track it)
	const PREVIEW_LINE_ID = "__preview__";

	// Track selection for editing (optional future enhancement)
	// For now, clicking a line in cart could populate formData, but let's stick to "Add New" flow first.

	// Pricing calculation for the current item
	const {
		pricingResult,
		isCalculating,
		error: pricingError,
		calculate,
	} = usePricingCalculation({
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
	// Optimized dependencies to prevent infinite loops and unnecessary calls (e.g. on notes change)
	useEffect(() => {
		calculate(formData);
	}, [
		calculate,
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

	// Preview line: Shows current trip in Shopping Cart in real-time
	// This line is NOT part of quoteLines - it's a visual preview only
	const previewLine: QuoteLine | null = useMemo(() => {
		// Only show preview if we have a valid price and addresses
		if (!pricingResult?.price || pricingResult.price <= 0) return null;
		if (!formData.pickupAddress) return null;

		const categoryName = allVehicleCategories?.find(
			(c) => c.id === formData.vehicleCategoryId,
		)?.name;

		// Create label - simplified version for preview
		const pickupCity =
			formData.pickupAddress.split(",")[0] || formData.pickupAddress;
		const dropoffCity = formData.dropoffAddress
			? formData.dropoffAddress.split(",")[0] || formData.dropoffAddress
			: "Disposition";

		return {
			id: PREVIEW_LINE_ID,
			type: "CALCULATED" as const,
			label: `${pickupCity} → ${dropoffCity}`,
			description:
				[
					categoryName,
					formData.tripType === "TRANSFER" && formData.isRoundTrip
						? "A/R"
						: null,
					pricingResult.tripAnalysis?.totalDistanceKm
						? `${Math.round(pricingResult.tripAnalysis.totalDistanceKm)} km`
						: null,
				]
					.filter(Boolean)
					.join(" • ") || undefined,
			quantity: 1,
			unitPrice: pricingResult.price,
			totalPrice: pricingResult.price,
			vatRate: 10,
			parentId: null,
			// DisplayData must match UniversalLineItemRow's expected interface
			displayData: {
				label: `${pickupCity} → ${dropoffCity}`,
				description:
					[
						categoryName,
						formData.tripType === "TRANSFER" && formData.isRoundTrip
							? "A/R"
							: null,
						pricingResult.tripAnalysis?.totalDistanceKm
							? `${Math.round(pricingResult.tripAnalysis.totalDistanceKm)} km`
							: null,
					]
						.filter(Boolean)
						.join(" • ") || undefined,
				quantity: 1,
				unitPrice: pricingResult.price,
				vatRate: 10,
				total: pricingResult.price,
			},
			sourceData: {
				origin: formData.pickupAddress,
				destination: formData.dropoffAddress,
				distance: pricingResult.tripAnalysis?.totalDistanceKm,
				duration: pricingResult.tripAnalysis?.totalDurationMinutes,
				basePrice: pricingResult.price,
				pickupAt: formData.pickupAt?.toISOString(),
			},
		};
	}, [formData, pricingResult, allVehicleCategories, PREVIEW_LINE_ID]);

	// Determine if blocking violations exist
	const violations = hasBlockingViolations(
		pricingResult?.complianceResult || null,
		pricingResult?.tripAnalysis?.compliancePlan,
	);

	// Story 26: Create quote mutation (now supports Yolo Mode payload)
	const createQuoteMutation = useMutation({
		mutationFn: async (linesOverride?: QuoteLine[]) => {
			if (!activeOrganization?.id) throw new Error("No organization");

			const actualLines = linesOverride || quoteLines;

			// If Yolo, we use the first Calculated line as "Primary" trip for legacy fields
			const primaryLine = actualLines.find((l) => l.type === "CALCULATED");
			// Cast sourceData safely
			const primaryData = (
				primaryLine?.sourceData as { formData: CreateQuoteFormData }
			)?.formData;

			// Use primary line data or fallback to current form data (if cart empty or no calc lines)
			const finalFormData = primaryData || formData;

			if (!finalFormData.pickupAt) {
				throw new Error("Date de prise en charge requise");
			}

			const response = await apiClient.vtc.quotes.$post({
				json: {
					organizationId: activeOrganization.id,
					...finalFormData,
					contact: undefined,
					endCustomer: undefined,
					vehicleCategory: undefined,
					pickupAt: finalFormData.pickupAt,
					stops: finalFormData.stops.map((s) => ({
						...s,
						latitude: s.latitude ?? 0,
						longitude: s.longitude ?? 0,
					})),
					lines: actualLines, // Send the full cart
					isYoloMode: true,
				} as any,
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					(errorData as { message?: string }).message ||
						"Failed to create quote",
				);
			}

			return await response.json();
		},
		onSuccess: (data) => {
			toast({
				title: t("quotes.create.success"),
				description: t("quotes.create.successDescription"),
			});
			router.push(`/app/${activeOrganization?.slug}/quotes/${data.id}`);
		},
		onError: (error) => {
			toast({
				title: t("quotes.create.error"),
				description: error.message,
				variant: "error",
			});
		},
	});

	// Helper: Create a line from current form state
	const createLineFromState = useCallback((): QuoteLine | null => {
		// Use formData.finalPrice if set, otherwise fallback to pricingResult.price
		const effectivePrice =
			formData.finalPrice > 0 ? formData.finalPrice : pricingResult?.price || 0;

		if (effectivePrice <= 0) {
			toast({
				title: t("quotes.create.validation.error"),
				description: t("quotes.create.validation.priceRequired"),
				variant: "error",
			});
			return null;
		}

		const categoryName = allVehicleCategories?.find(
			(c) => c.id === formData.vehicleCategoryId,
		)?.name;

		const pickupCity =
			formData.pickupAddress?.split(",")[0] || formData.pickupAddress || "";
		const dropoffCity = formData.dropoffAddress
			? formData.dropoffAddress.split(",")[0] || formData.dropoffAddress
			: "Disposition";

		const tempId = crypto.randomUUID();
		return {
			id: tempId,
			type: "CALCULATED",
			label: `${pickupCity} → ${dropoffCity}`,
			description:
				[
					categoryName,
					formData.tripType === "TRANSFER" && formData.isRoundTrip
						? "A/R"
						: null,
					pricingResult?.tripAnalysis?.totalDistanceKm
						? `${Math.round(pricingResult.tripAnalysis.totalDistanceKm)} km`
						: null,
				]
					.filter(Boolean)
					.join(" • ") ||
				formData.notes ||
				undefined,
			quantity: 1,
			unitPrice: effectivePrice,
			totalPrice: effectivePrice,
			vatRate: 10,
			parentId: null,
			// DisplayData must match UniversalLineItemRow's expected interface
			displayData: {
				label: `${pickupCity} → ${dropoffCity}`,
				description:
					[
						categoryName,
						formData.tripType === "TRANSFER" && formData.isRoundTrip
							? "A/R"
							: null,
						pricingResult?.tripAnalysis?.totalDistanceKm
							? `${Math.round(pricingResult.tripAnalysis.totalDistanceKm)} km`
							: null,
					]
						.filter(Boolean)
						.join(" • ") || undefined,
				quantity: 1,
				unitPrice: effectivePrice,
				vatRate: 10,
				total: effectivePrice,
			},
			sourceData: {
				origin: formData.pickupAddress,
				destination: formData.dropoffAddress,
				distance: pricingResult?.tripAnalysis?.totalDistanceKm,
				duration: pricingResult?.tripAnalysis?.totalDurationMinutes,
				basePrice: effectivePrice,
				pickupAt: formData.pickupAt?.toISOString(),
				formData: { ...formData }, // Snapshot
				pricingResult: pricingResult ? { ...pricingResult } : null,
			},
		};
	}, [formData, pricingResult, t, allVehicleCategories, toast]);

	// Handler: Add Current Item to Cart
	const handleAddItemToCart = useCallback(() => {
		const newLine = createLineFromState();
		if (newLine) {
			useQuoteLinesStore.setState((state) => ({
				lines: [...state.lines, newLine],
			}));
			toast({
				title: t("quotes.create.addedToCart"),
				description: t("quotes.create.addedToCartDesc"),
			});
		}
	}, [createLineFromState, t, toast]);

	// Handler: Save Quote
	const handleSaveQuote = () => {
		let linesToSubmit = quoteLines;

		// If cart is empty, try to add current form data as a line
		if (linesToSubmit.length === 0) {
			const implicitLine = createLineFromState();
			if (!implicitLine) return; // Validation failed inside helper
			linesToSubmit = [implicitLine];
		}

		// Mutate with specific lines (overriding the state access in mutationFn if we passed args,
		// but mutationFn reads from closure `quoteLines` which is stale if we don't pass it.
		// We need to update mutationFn to accept arguments!)

		// Actually, better to just pass the lines to mutate.
		createQuoteMutation.mutate(linesToSubmit);
	};

	return (
		<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
			{/* LEFT COLUMN: Basic Info (Form) */}
			<div className="space-y-6 pr-2 lg:col-span-4">
				<QuoteBasicInfoPanel
					formData={formData}
					onFormChange={handleFormChange}
					allCategories={allVehicleCategories || []}
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
					/>
				)}
				{violations && (
					<ComplianceAlertBanner
						violations={(
							pricingResult?.tripAnalysis?.compliancePlan?.originalViolations ||
							[]
						).map((v) => ({
							...v,
							type: v.type as any,
							unit: "minutes",
							severity: "BLOCKING" as any,
						}))}
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
				{/* 1. Pointing Part: Pricing of CURRENT item + Add to Cart */}
				<div>
					<QuotePricingPanel
						formData={formData}
						pricingResult={pricingResult}
						isCalculating={isCalculating}
						isSubmitting={false}
						onFormChange={handleFormChange}
						onSubmit={handleAddItemToCart} // Kept for logic reference or hidden button trigger if prop changed later
						hideSubmit={true} // HIDE THE DUPLICATE BUTTON
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
						{t("quotes.yolo.linesEditor") || "Panier"}
					</h3>

					{/* Preview Line - Shown when configuring first item and cart is empty */}
					{previewLine && quoteLines.length === 0 && (
						<div className="fade-in slide-in-from-top-2 mb-4 animate-in duration-300">
							<div className="mb-2 flex items-center gap-2 px-1 font-medium text-primary text-xs uppercase tracking-wider">
								<span className="relative flex h-2 w-2">
									<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
									<span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
								</span>
								{t("quotes.yolo.previewLabel") ||
									"Course en cours de configuration"}
							</div>
							<div className="rounded-md border bg-muted/20 opacity-90 ring-1 ring-primary/20 grayscale-[0.1]">
								<UniversalLineItemRow
									id={previewLine.id || PREVIEW_LINE_ID}
									type={previewLine.type}
									displayData={previewLine.displayData as any}
									sourceData={previewLine.sourceData as any}
									depth={0}
									isExpanded={false}
									disabled={true}
									currency="EUR"
									dispatchable={false}
									// Dummy handlers for read-only preview
									onDisplayDataChange={() => {}}
									onToggleExpand={() => {}}
									onDetach={() => {}}
									onInsert={() => {}}
									onSelectionChange={() => {}}
									onDispatchableChange={() => {}}
								/>
							</div>
						</div>
					)}

					<div>
						<YoloQuoteEditor
							initialLines={quoteLines}
							onChange={setQuoteLines}
							readOnly={createQuoteMutation.isPending}
							currency="EUR"
						/>
					</div>

					{/* Global Save Button - Sticky at bottom */}
					<div className="sticky bottom-0 z-10 mt-4 border-t bg-background pt-4">
						<div className="mb-2 flex items-center justify-between px-1">
							<span className="text-muted-foreground text-sm">
								{t("quotes.create.totalQuote") || "Total Devis"}
							</span>
							{/* Note: Total matches sum of lines. Calculated in YoloEditor but helpful to show here? */}
						</div>
						<Button
							size="lg"
							className="w-full"
							onClick={handleSaveQuote}
							disabled={createQuoteMutation.isPending}
						>
							{createQuoteMutation.isPending && (
								<Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
							)}
							{t("quotes.create.createQuote")}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
