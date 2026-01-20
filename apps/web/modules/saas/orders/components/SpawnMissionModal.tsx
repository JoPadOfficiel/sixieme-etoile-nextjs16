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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { Textarea } from "@ui/components/textarea";
import { useToast } from "@ui/hooks/use-toast";
import { apiClient } from "@shared/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, RocketIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useState } from "react";
import { format } from "date-fns";

/**
 * Story 28.7: Manual Item Handling UI
 * Modal for manually spawning a mission from a quote line
 */

interface QuoteLine {
	id: string;
	label: string;
	type: string;
	totalPrice: string;
	sourceData: unknown;
}

interface SpawnMissionModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	quoteLine: QuoteLine;
	orderId: string;
	defaultDate?: Date;
	defaultVehicleCategoryId?: string;
	onSuccess?: (mission: { id: string; status: string }) => void;
}

interface VehicleCategory {
	id: string;
	name: string;
	code: string;
}

export function SpawnMissionModal({
	open,
	onOpenChange,
	quoteLine,
	orderId,
	defaultDate,
	defaultVehicleCategoryId,
	onSuccess,
}: SpawnMissionModalProps) {
	const t = useTranslations();
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const params = useParams();
	const organizationSlug = params.organizationSlug as string;

	// Form state - initialized with defaults, reset handled by parent via key prop
	const [date, setDate] = useState<string>(
		defaultDate ? format(defaultDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")
	);
	const [time, setTime] = useState<string>("09:00");
	const [vehicleCategoryId, setVehicleCategoryId] = useState<string>(
		defaultVehicleCategoryId ?? ""
	);
	const [notes, setNotes] = useState<string>("");

	// Fetch vehicle categories
	const { data: vehicleCategories, isLoading: isLoadingCategories } = useQuery({
		queryKey: ["vehicleCategories", organizationSlug],
		queryFn: async () => {
			const response = await apiClient.vtc["vehicle-categories"].$get();
			if (!response.ok) {
				throw new Error("Failed to fetch vehicle categories");
			}
			const data = await response.json();
			return (data as { data: VehicleCategory[] }).data;
		},
		enabled: open,
	});

	// Spawn mission mutation
	const spawnMutation = useMutation({
		mutationFn: async () => {
			// Combine date and time into ISO datetime
			const startAt = new Date(`${date}T${time}:00`).toISOString();

			const response = await apiClient.vtc.missions["spawn-manual"].$post({
				json: {
					quoteLineId: quoteLine.id,
					orderId,
					startAt,
					vehicleCategoryId,
					notes: notes || undefined,
				},
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					(errorData as { message?: string }).message || "Failed to spawn mission"
				);
			}

			return response.json();
		},
		onSuccess: (data) => {
			toast({
				title: t("orders.spawnMission.success"),
				description: t("orders.spawnMission.successDescription"),
			});

			// Invalidate queries to refresh data
			queryClient.invalidateQueries({ queryKey: ["order", orderId] });
			queryClient.invalidateQueries({ queryKey: ["orderQuoteLines", orderId] });
			queryClient.invalidateQueries({ queryKey: ["missions"] });

			onOpenChange(false);
			
			if (onSuccess && (data as { mission?: { id: string; status: string } }).mission) {
				onSuccess((data as { mission: { id: string; status: string } }).mission);
			}
		},
		onError: (error) => {
			toast({
				title: t("orders.spawnMission.error"),
				description: error instanceof Error ? error.message : t("orders.spawnMission.errorDescription"),
				variant: "destructive",
			});
		},
	});

	const isFormValid = date && time && vehicleCategoryId;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<RocketIcon className="h-5 w-5" />
						{t("orders.spawnMission.title")}
					</DialogTitle>
					<DialogDescription>
						{t("orders.spawnMission.description")}
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-4">
					{/* Line info */}
					<div className="rounded-md bg-muted p-3">
						<p className="text-sm font-medium">{quoteLine.label}</p>
						<p className="text-xs text-muted-foreground">
							{t("orders.spawnMission.lineType")}: {quoteLine.type} • {Number(quoteLine.totalPrice).toFixed(2)}€
						</p>
					</div>

					{/* Date */}
					<div className="grid gap-2">
						<Label htmlFor="date">{t("orders.spawnMission.date")} *</Label>
						<Input
							id="date"
							type="date"
							value={date}
							onChange={(e) => setDate(e.target.value)}
							required
						/>
					</div>

					{/* Time */}
					<div className="grid gap-2">
						<Label htmlFor="time">{t("orders.spawnMission.time")} *</Label>
						<Input
							id="time"
							type="time"
							value={time}
							onChange={(e) => setTime(e.target.value)}
							required
						/>
					</div>

					{/* Vehicle Category */}
					<div className="grid gap-2">
						<Label htmlFor="vehicleCategory">
							{t("orders.spawnMission.vehicleCategory")} *
						</Label>
						<Select
							value={vehicleCategoryId}
							onValueChange={setVehicleCategoryId}
							disabled={isLoadingCategories}
						>
							<SelectTrigger>
								<SelectValue
									placeholder={
										isLoadingCategories
											? t("common.loading")
											: t("orders.spawnMission.selectCategory")
									}
								/>
							</SelectTrigger>
							<SelectContent>
								{vehicleCategories?.map((category) => (
									<SelectItem key={category.id} value={category.id}>
										{category.name} ({category.code})
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Notes */}
					<div className="grid gap-2">
						<Label htmlFor="notes">{t("orders.spawnMission.notes")}</Label>
						<Textarea
							id="notes"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder={t("orders.spawnMission.notesPlaceholder")}
							rows={3}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={spawnMutation.isPending}
					>
						{t("common.cancel")}
					</Button>
					<Button
						onClick={() => spawnMutation.mutate()}
						disabled={!isFormValid || spawnMutation.isPending}
					>
						{spawnMutation.isPending ? (
							<>
								<Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
								{t("common.creating")}
							</>
						) : (
							<>
								<RocketIcon className="mr-2 h-4 w-4" />
								{t("orders.spawnMission.createMission")}
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
