"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { apiClient } from "@shared/lib/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { useToast } from "@ui/hooks/use-toast";
import { Loader2Icon, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOptionalFees } from "../hooks/useOptionalFees";
import { usePricingCalculation } from "../hooks/usePricingCalculation";
import { useScenarioHelpers } from "../hooks/useScenarioHelpers";
import { useVehicleCategories } from "../hooks/useVehicleCategories";
import type { CreateQuoteFormData } from "../types";
import { hasBlockingViolations, initialCreateQuoteFormData } from "../types";
import type { AddedFee } from "./AddQuoteFeeDialog";
import { AirportHelperPanel } from "./AirportHelperPanel";
import { CapacityWarningAlert } from "./CapacityWarningAlert";
import { ComplianceAlertBanner } from "./ComplianceAlertBanner";
import { QuoteBasicInfoPanel } from "./QuoteBasicInfoPanel";
import { QuotePricingPanel } from "./QuotePricingPanel";
// Story 26 Integration: Import YoloQuoteEditor
import { YoloQuoteEditor } from "./yolo/YoloQuoteEditor";
import type { QuoteLine } from "./yolo/dnd-utils";

/**
 * CreateQuoteCockpit Component
 *
 * Main 3-column layout for quote creation.
 * - Left: Basic info (contact, trip details, vehicle)
 * - Center: Trip Transparency (costs, segments, profitability) OR Yolo Editor
 * - Right: Pricing & options (price, notes, submit)
 *
 * Story 6.5: Includes blocking banner for compliance violations
 * Story 6.6: Includes airport helpers and capacity warnings
 * Story 26: Integration with Yolo Mode flexible billing
 *
 * @see Story 6.2: Create Quote 3-Column Cockpit
 * @see Story 6.5: Blocking and Non-Blocking Alerts
 * @see Story 6.6: Helpers for Common Scenarios
 * @see Story 26: Yolo Mode Integration
 * @see UX Spec 8.3.2 Create Quote
 */
export function CreateQuoteCockpit() {
	const t = useTranslations();
	const { toast } = useToast();
	const router = useRouter();
	const queryClient = useQueryClient();
	const { activeOrganization } = useActiveOrganization();

	// Form state
	const [formData, setFormData] = useState<CreateQuoteFormData>(
		initialCreateQuoteFormData,
	);

	// Added fees and promotions (manual additions via dialog)
	const [addedFees, setAddedFees] = useState<AddedFee[]>([]);

	// Story 26: Yolo Mode toggle
	// Story 26.16: Yolo Mode is now the standard (Shopping Cart Mode)
	// const [isYoloMode, setIsYoloMode] = useState<boolean>(true);
	const isYoloMode = true;

	// Story 26: Quote lines for Yolo Mode
	const [quoteLines, setQuoteLines] = useState<QuoteLine[]>([]);

	// Pricing calculation hook (for standard trip types)
	const {
		pricingResult,
		isCalculating,
		error: pricingError,
		calculate,
	} = usePricingCalculation({
		debounceMs: 500,
	});

	// Story 6.6: Vehicle categories and optional fees for helpers
	const { categories: allVehicleCategories } = useVehicleCategories();
	const { fees: optionalFees } = useOptionalFees();

	// Story 6.6: Scenario helpers (airport detection, capacity validation)
	const { airportDetection, capacityWarning, getApplicableFees } =
		useScenarioHelpers(formData, allVehicleCategories);

	// Story 6.6: Get applicable fees for current scenario
	const applicableFees = getApplicableFees(optionalFees, airportDetection);

	// Story 6.6: Auto-select applicable fees when airport is detected
	const previousAirportRef = useRef<boolean>(false);
	useEffect(() => {
		if (airportDetection.isAirportTransfer && !previousAirportRef.current) {
			// Auto-select all applicable fees
			const feeIds = applicableFees.map((f) => f.id);
			setFormData((prev) => ({
				...prev,
				selectedOptionalFeeIds: feeIds,
			}));
		}
		previousAirportRef.current = airportDetection.isAirportTransfer;
	}, [airportDetection.isAirportTransfer, applicableFees]);

	// Update form field
	const handleFormChange = useCallback(
		<K extends keyof CreateQuoteFormData>(
			field: K,
			value: CreateQuoteFormData[K],
		) => {
			setFormData((prev) => ({ ...prev, [field]: value }));
		},
		[],
	);

	// Handle adding a fee or promotion via dialog
	const handleAddFee = useCallback((fee: AddedFee) => {
		setAddedFees((prev) => [...prev, fee]);
	}, []);

	// Handle removing a fee or promotion
	const handleRemoveFee = useCallback((feeId: string) => {
		setAddedFees((prev) => prev.filter((f) => f.id !== feeId));
	}, []);

	// Handle updating a fee or promotion (quantity)
	const handleUpdateFee = useCallback((feeId: string, quantity: number) => {
		setAddedFees((prev) =>
			prev.map((f) => (f.id === feeId ? { ...f, quantity } : f)),
		);
	}, []);

	// Trigger pricing calculation when relevant fields change
	// Using a ref to track previous price to avoid cascading renders

	// Store calculate in a ref to avoid dependency issues
	const calculateRef = useRef(calculate);
	calculateRef.current = calculate;

	useEffect(() => {
		// Use ref to avoid infinite loops from calculate dependency changes
		calculateRef.current(formData);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		formData.pickupAddress,
		formData.pickupLatitude,
		formData.pickupLongitude,
		formData.dropoffAddress,
		formData.dropoffLatitude,
		formData.dropoffLongitude,
		formData.pickupAt,
		formData.vehicleCategoryId,
		formData.contactId,
		formData.passengerCount,
		formData.luggageCount,
		formData.tripType,
		// Story 19.4: Add DISPO-specific fields to trigger recalculation
		formData.durationHours,
		formData.maxKilometers,
		formData.isRoundTrip,
		// Note: calculate is NOT a dependency - we use ref to avoid infinite loops
	]);

	// Auto-set final price when pricing result changes (only if not already set)
	// Using ref to track and avoid cascading renders
	// Story 26.16: Decoupled pricing. finalPrice is ONLY updated by the sum of lines (YoloTotal).
	// We no longer auto-set finalPrice from the single trip calculation.

	// Show error toast when pricing fails
	useEffect(() => {
		if (pricingError) {
			toast({
				title: t("quotes.create.pricingError"),
				description: pricingError.message,
				variant: "error",
			});
		}
	}, [pricingError, t, toast]);

	/**
	 * Story 26: Convert pricing result to initial CALCULATED line for Yolo Mode
	 */
	/**
	 * Story 26.16: Helper to convert current form state into a QuoteLine
	 * Used when user clicks "Add to Quote"
	 */
	const getLineFromCurrentForm = useCallback((): QuoteLine | null => {
		if (!pricingResult || !formData.pickupAddress) return null;

		const tripLabel =
			formData.tripType === "DISPO"
				? `Mise à disposition - ${formData.durationHours}h`
				: `${formData.pickupAddress} → ${formData.dropoffAddress || "..."}`;

		// Story 26.16: Use formData.finalPrice (which is edited in the pricing panel)
		// instead of just pricingResult.price, to capture manual overrides or adjustments *before* adding to cart
		const linePrice =
			formData.finalPrice > 0 ? formData.finalPrice : pricingResult.price;

		return {
			tempId: `calc-${Date.now()}`,
			type: "CALCULATED" as const,
			label: tripLabel,
			description: formData.tripType,
			quantity: 1,
			unitPrice: linePrice,
			totalPrice: linePrice,
			vatRate: 10, // Default VAT rate
			parentId: null,
			sortOrder: quoteLines.length, // Add at end
			sourceData: {
				origin: formData.pickupAddress,
				destination: formData.dropoffAddress,
				distance: pricingResult.tripAnalysis?.totalDistance,
				duration: pricingResult.tripAnalysis?.totalDuration,
				basePrice: linePrice,
				internalCost: pricingResult.internalCost,
				pickupAt: formData.pickupAt?.toISOString(),
				pickupLatitude: formData.pickupLatitude,
				pickupLongitude: formData.pickupLongitude,
				dropoffLatitude: formData.dropoffLatitude,
				dropoffLongitude: formData.dropoffLongitude,
				tripType: formData.tripType,
				vehicleCategoryId: formData.vehicleCategoryId,
			},
			displayData: {
				label: tripLabel,
				quantity: 1,
				unitPrice: linePrice,
				vatRate: 10,
				total: linePrice,
			},
		};
	}, [pricingResult, formData, quoteLines.length]);

	/**
	 * Story 26.16: Add current calculation to the Shopping Cart (Yolo Lines)
	 */
	const handleAddCalculationToCart = useCallback(() => {
		const newLine = getLineFromCurrentForm();
		if (!newLine) return;

		setQuoteLines((prev) => [...prev, newLine]);

		toast({
			title: t("quotes.create.lineAdded"),
			description: newLine.label,
		});

		// Optional: We could reset the form here, but keeping values allows for rapid "Clone & Edit"
		// e.g. Same trip but different time.
	}, [getLineFromCurrentForm, toast, t]);

	/**
	 * Story 26: Auto-populate Yolo lines when entering Yolo Mode with pricing data
	 */
	// Story 26.16: Removed auto-populate useEffect. We now rely on explicit "Add" button.
	// useEffect(() => { ... }, ...);

	/**
	 * Story 26: Calculate total from Yolo lines
	 */
	const yoloTotal = useMemo(() => {
		return quoteLines.reduce((sum, line) => sum + (line.totalPrice || 0), 0);
	}, [quoteLines]);

	/**
	 * Story 26: Sync Yolo total to finalPrice
	 */
	useEffect(() => {
		if (isYoloMode && yoloTotal > 0) {
			setFormData((prev) => ({ ...prev, finalPrice: yoloTotal }));
		}
	}, [isYoloMode, yoloTotal]);

	// Create quote mutation
	const createQuoteMutation = useMutation({
		mutationFn: async () => {
			// Calculate total of added fees (positive for fees, negative for promotions)
			const addedFeesTotal = addedFees.reduce((sum, fee) => {
				return (
					sum + (fee.type === "promotion" ? -Math.abs(fee.amount) : fee.amount)
				);
			}, 0);

			// Story 26.16: In Cart Mode, the "Main Trip" (required by legacy API) is the first line of the cart.
			// We use the first line's data to populate the required fields, ensuring the quote is valid even if the form is empty.
			const primaryLine = quoteLines.length > 0 ? quoteLines[0] : null;
			const mainSource = primaryLine?.sourceData;

			// Fallback to form data if no lines (should not happen due to button disabled state) or explicit override
			const vehicleCategoryId =
				mainSource?.vehicleCategoryId || formData.vehicleCategoryId;
			const pickupAddress = mainSource?.origin || formData.pickupAddress;
			const pickupLatitude =
				mainSource?.pickupLatitude || formData.pickupLatitude;
			const pickupLongitude =
				mainSource?.pickupLongitude || formData.pickupLongitude;
			const dropoffAddress =
				mainSource?.destination || formData.dropoffAddress || null;
			const dropoffLatitude =
				mainSource?.dropoffLatitude || formData.dropoffLatitude;
			const dropoffLongitude =
				mainSource?.dropoffLongitude || formData.dropoffLongitude;
			const pickupAt = mainSource?.pickupAt
				? new Date(mainSource.pickupAt).toISOString()
				: formData.pickupAt!.toISOString();
			const durationHours = mainSource?.duration
				? Math.ceil(mainSource.duration / 60) // approx
				: formData.durationHours;
			const tripType = mainSource?.tripType || formData.tripType;

			// Final price includes base price + added fees/promotions
			// In Yolo Mode, use yoloTotal instead
			const basePrice = isYoloMode ? yoloTotal : formData.finalPrice;
			const computedFinalPrice = basePrice + addedFeesTotal;

			// Standard quote creation for other trip types
			const response = await apiClient.vtc.quotes.$post({
				json: {
					contactId: formData.contactId,
					// Story 24.4: Include endCustomerId for partner agency sub-contacts
					endCustomerId: formData.endCustomerId || null,
					vehicleCategoryId: vehicleCategoryId,
					pricingMode:
						formData.pricingMode || pricingResult?.pricingMode || "DYNAMIC",
					tripType: tripType,
					pickupAt: pickupAt,
					pickupAddress: pickupAddress,
					pickupLatitude: pickupLatitude,
					pickupLongitude: pickupLongitude,
					// Story 16.1: dropoffAddress is optional for DISPO and OFF_GRID
					dropoffAddress: dropoffAddress,
					dropoffLatitude: dropoffLatitude,
					dropoffLongitude: dropoffLongitude,
					// Story 16.1: Trip type specific fields
					isRoundTrip: formData.isRoundTrip,
					stops:
						formData.stops.length > 0
							? formData.stops
									.filter(
										(
											s,
										): s is typeof s & {
											latitude: number;
											longitude: number;
										} => s.latitude !== null && s.longitude !== null,
									)
									.map((s) => ({
										latitude: s.latitude,
										longitude: s.longitude,
										address: s.address,
										order: s.order,
									}))
							: null,
					returnDate: formData.returnDate?.toISOString() ?? null,
					durationHours: durationHours,
					maxKilometers: formData.maxKilometers,
					passengerCount: formData.passengerCount,
					luggageCount: formData.luggageCount,
					suggestedPrice: pricingResult?.price ?? formData.finalPrice,
					finalPrice: computedFinalPrice,
					partnerGridPrice:
						pricingResult?.bidirectionalPricing?.partnerGridPrice ?? null,
					clientDirectPrice:
						pricingResult?.bidirectionalPricing?.clientDirectPrice ?? null,
					internalCost: pricingResult?.internalCost ?? null,
					marginPercent: pricingResult?.marginPercent ?? null,
					tripAnalysis:
						(pricingResult?.tripAnalysis as unknown as Record<
							string,
							unknown
						> | null) ?? null,
					appliedRules: {
						rules: pricingResult?.appliedRules ?? [],
						selectedOptionalFeeIds: formData.selectedOptionalFeeIds,
						// Snapshot the selected fees details for invoice generation
						selectedOptionalFees: optionalFees
							.filter((fee) => formData.selectedOptionalFeeIds.includes(fee.id))
							.map((fee) => ({
								id: fee.id,
								name: fee.name,
								description: fee.description,
								amount: fee.amount,
								amountType: fee.amountType,
								isTaxable: fee.isTaxable,
								vatRate: fee.vatRate,
							})),
						// Manually added fees and promotions via dialog
						addedFees: addedFees.map((fee) => ({
							id: fee.id,
							type: fee.type,
							name: fee.name,
							description: fee.description,
							amount: fee.amount,
							vatRate: fee.vatRate,
							discountType: fee.discountType,
							promoCode: fee.promoCode,
							quantity: fee.quantity, // Add quantity to saved data
						})),
					},
					validUntil: formData.validUntil?.toISOString() ?? null,
					notes: formData.notes || null,
				},
			});

			if (!response.ok) {
				throw new Error("Failed to create quote");
			}

			const quoteData = await response.json();

			// Story 26: If Yolo Mode is enabled, also send the lines
			if (isYoloMode && quoteLines.length > 0 && quoteData.quote?.id) {
				const linesPayload = quoteLines.map((line, index) => ({
					tempId: line.tempId || `temp-${index}`,
					type: line.type,
					label: line.label,
					description: line.description || null,
					quantity: line.quantity ?? 1,
					unitPrice: line.unitPrice ?? 0,
					totalPrice: line.totalPrice ?? 0,
					vatRate: line.vatRate ?? 10,
					parentId: line.parentId || null,
					sortOrder: index,
					sourceData: line.sourceData || null,
					displayData: line.displayData || {
						label: line.label,
						quantity: line.quantity ?? 1,
						unitPrice: line.unitPrice ?? 0,
						vatRate: line.vatRate ?? 10,
						total: line.totalPrice ?? 0,
					},
				}));

				const linesResponse = await apiClient.vtc.quotes[
					":quoteId"
				].lines.$patch({
					param: { quoteId: quoteData.quote.id },
					json: {
						lines: linesPayload,
						recalculateTotals: true,
					},
				});

				if (!linesResponse.ok) {
					console.error("Failed to save quote lines, but quote was created");
					// Don't throw - the quote is created, lines just failed
				}
			}

			return quoteData;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["quotes"] });
			toast({
				title: t("quotes.create.success"),
			});
			router.push(`/app/${activeOrganization?.slug}/quotes`);
		},
		onError: () => {
			toast({
				title: t("quotes.create.error"),
				variant: "error",
			});
		},
	});

	// Story 6.5 + 19.1: Check for blocking violations (considering staffing plan)
	// If a staffing plan exists (DOUBLE_CREW, etc.), violations are resolved and trip is NOT blocked
	const hasViolations = hasBlockingViolations(
		pricingResult?.complianceResult ?? null,
		pricingResult?.tripAnalysis?.compliancePlan,
	);

	// Story 26.16: Deprecated handleSubmit in favor of handleAddCalculationToCart
	// Quote creation is now handled by the "Enregistrer le Devis" button in the footer.

	/**
	 * Story 26: Handle changes from YoloQuoteEditor
	 */
	const handleQuoteLinesChange = useCallback((lines: QuoteLine[]) => {
		setQuoteLines(lines);
	}, []);

	return (
		<div className="space-y-6">
			{/* Story 6.5: Blocking Alert Banner for Compliance Violations */}
			{pricingResult?.complianceResult && hasViolations && (
				<ComplianceAlertBanner
					violations={pricingResult.complianceResult.violations}
					className="mb-2"
				/>
			)}

			{/* 3-Column Layout */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				{/* Left Column - Basic Info */}
				<div className="space-y-4 lg:col-span-1">
					<QuoteBasicInfoPanel
						formData={formData}
						onFormChange={handleFormChange}
						allCategories={allVehicleCategories}
						disabled={createQuoteMutation.isPending}
					/>

					{/* Story 6.6: Airport Helper Panel */}
					<AirportHelperPanel
						airportDetection={airportDetection}
						flightNumber={formData.flightNumber}
						onFlightNumberChange={(value) =>
							handleFormChange("flightNumber", value)
						}
						waitingTimeMinutes={formData.waitingTimeMinutes}
						onWaitingTimeChange={(value) =>
							handleFormChange("waitingTimeMinutes", value)
						}
						applicableFees={applicableFees}
						selectedFeeIds={formData.selectedOptionalFeeIds}
						onFeeToggle={(feeId, checked) => {
							setFormData((prev) => ({
								...prev,
								selectedOptionalFeeIds: checked
									? [...prev.selectedOptionalFeeIds, feeId]
									: prev.selectedOptionalFeeIds.filter((id) => id !== feeId),
							}));
						}}
						disabled={createQuoteMutation.isPending}
					/>

					{/* Story 6.6: Capacity Warning Alert */}
					{capacityWarning && formData.vehicleCategory && (
						<CapacityWarningAlert
							warning={capacityWarning}
							currentCategoryName={formData.vehicleCategory.name}
							onApplySuggestion={() => {
								if (capacityWarning.suggestedCategory) {
									handleFormChange(
										"vehicleCategoryId",
										capacityWarning.suggestedCategory.id,
									);
									handleFormChange(
										"vehicleCategory",
										capacityWarning.suggestedCategory,
									);
								}
							}}
							disabled={createQuoteMutation.isPending}
						/>
					)}
				</div>

				{/* Center Column - Yolo Editor (Shopping Cart) */}
				<div className="lg:col-span-1">
					<Card className="flex h-full flex-col bg-slate-50/50 dark:bg-slate-900/20">
						<CardHeader className="rounded-t-lg border-b bg-background pb-2">
							<div className="flex items-center justify-between">
								<CardTitle className="flex items-center gap-2 text-base">
									<Sparkles className="h-4 w-4 text-primary" />
									{t("quotes.yolo.linesEditor") || "Panier du Devis"}
								</CardTitle>
								<div className="font-medium text-muted-foreground text-sm">
									Total:{" "}
									{new Intl.NumberFormat("fr-FR", {
										style: "currency",
										currency: "EUR",
									}).format(yoloTotal)}
								</div>
							</div>
						</CardHeader>
						<CardContent className="flex flex-1 flex-col pt-4">
							<YoloQuoteEditor
								initialLines={quoteLines}
								readOnly={createQuoteMutation.isPending}
								currency="EUR"
								onChange={handleQuoteLinesChange}
							/>

							<div className="-mx-6 sticky bottom-0 z-10 mt-6 flex flex-col gap-3 border-t bg-background/95 px-6 py-4 pt-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] backdrop-blur">
								<div className="flex items-center justify-between">
									<span className="font-medium text-muted-foreground text-sm">
										Total Final
									</span>
									<span className="font-bold text-primary text-xl">
										{new Intl.NumberFormat("fr-FR", {
											style: "currency",
											currency: "EUR",
										}).format(yoloTotal)}
									</span>
								</div>
								<Button
									size="lg"
									onClick={() => createQuoteMutation.mutate()}
									disabled={
										quoteLines.length === 0 ||
										createQuoteMutation.isPending ||
										hasViolations
									}
									className="w-full shadow-lg"
								>
									{createQuoteMutation.isPending ? (
										<>
											<Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
											Création...
										</>
									) : (
										"Enregistrer le Devis"
									)}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Right Column - Pricing & Options */}
				<div className="lg:col-span-1">
					<QuotePricingPanel
						formData={formData}
						pricingResult={pricingResult}
						isCalculating={isCalculating}
						isSubmitting={false}
						onFormChange={handleFormChange}
						onSubmit={handleAddCalculationToCart}
						submitLabel={t("quotes.create.addToCart") || "Ajouter au Panier"}
						hasBlockingViolations={hasViolations}
						addedFees={addedFees}
						onAddFee={handleAddFee}
						onRemoveFee={handleRemoveFee}
						onUpdateFee={handleUpdateFee}
					/>
				</div>
			</div>
		</div>
	);
}

export default CreateQuoteCockpit;
