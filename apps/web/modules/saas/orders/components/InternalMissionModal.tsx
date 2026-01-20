"use client";

import { apiClient } from "@shared/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { format } from "date-fns";
import { Loader2Icon, WrenchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useState } from "react";

/**
 * Story 28.13: Internal Mission Modal
 * Creates internal (non-billable) missions without a quote line source
 */

interface InternalMissionModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	orderId: string;
	onSuccess?: (mission: {
		id: string;
		status: string;
		isInternal: boolean;
	}) => void;
}

interface VehicleCategory {
	id: string;
	name: string;
	code: string;
}

export function InternalMissionModal({
	open,
	onOpenChange,
	orderId,
	onSuccess,
}: InternalMissionModalProps) {
	const t = useTranslations();
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const params = useParams();
	const organizationSlug = params.organizationSlug as string;

	// Form state
	const [label, setLabel] = useState<string>("");
	const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
	const [time, setTime] = useState<string>("09:00");
	const [vehicleCategoryId, setVehicleCategoryId] = useState<string>("");
	const [notes, setNotes] = useState<string>("");

	// Reset form when modal closes
	const handleOpenChange = (newOpen: boolean) => {
		if (!newOpen) {
			// Reset form on close
			setLabel("");
			setDate(format(new Date(), "yyyy-MM-dd"));
			setTime("09:00");
			setVehicleCategoryId("");
			setNotes("");
		}
		onOpenChange(newOpen);
	};

	// Fetch vehicle categories (optional for internal missions)
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

	// Create internal mission mutation
	const createMutation = useMutation({
		mutationFn: async () => {
			// Combine date and time into ISO datetime
			const startAt = new Date(`${date}T${time}:00`).toISOString();

			const response = await apiClient.vtc.missions["create-internal"].$post({
				json: {
					orderId,
					label,
					startAt,
					vehicleCategoryId: vehicleCategoryId || undefined,
					notes: notes || undefined,
				},
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					(errorData as { message?: string }).message ||
						"Failed to create internal mission",
				);
			}

			return response.json();
		},
		onSuccess: (data) => {
			toast({
				title: t("orders.internalMission.success"),
				description: t("orders.internalMission.successDescription"),
			});

			// Invalidate queries to refresh data
			queryClient.invalidateQueries({ queryKey: ["order", orderId] });
			queryClient.invalidateQueries({ queryKey: ["orderMissions", orderId] });
			queryClient.invalidateQueries({ queryKey: ["missions"] });

			handleOpenChange(false);

			if (
				onSuccess &&
				(
					data as {
						mission?: { id: string; status: string; isInternal: boolean };
					}
				).mission
			) {
				onSuccess(
					(
						data as {
							mission: { id: string; status: string; isInternal: boolean };
						}
					).mission,
				);
			}
		},
		onError: (error) => {
			toast({
				title: t("orders.internalMission.error"),
				description:
					error instanceof Error
						? error.message
						: t("orders.internalMission.errorDescription"),
				variant: "destructive",
			});
		},
	});

	const isFormValid = label.trim() && date && time;

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<WrenchIcon className="h-5 w-5" />
						{t("orders.internalMission.title")}
					</DialogTitle>
					<DialogDescription>
						{t("orders.internalMission.description")}
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-4">
					{/* Task Label */}
					<div className="grid gap-2">
						<Label htmlFor="label">{t("orders.internalMission.label")} *</Label>
						<Input
							id="label"
							value={label}
							onChange={(e) => setLabel(e.target.value)}
							placeholder={t("orders.internalMission.labelPlaceholder")}
							required
						/>
					</div>

					{/* Date */}
					<div className="grid gap-2">
						<Label htmlFor="date">{t("orders.internalMission.date")} *</Label>
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
						<Label htmlFor="time">{t("orders.internalMission.time")} *</Label>
						<Input
							id="time"
							type="time"
							value={time}
							onChange={(e) => setTime(e.target.value)}
							required
						/>
					</div>

					{/* Vehicle Category (Optional) */}
					<div className="grid gap-2">
						<Label htmlFor="vehicleCategory">
							{t("orders.internalMission.vehicleCategory")}
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
											: t("orders.internalMission.selectCategory")
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
						<Label htmlFor="notes">{t("orders.internalMission.notes")}</Label>
						<Textarea
							id="notes"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder={t("orders.internalMission.notesPlaceholder")}
							rows={3}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => handleOpenChange(false)}
						disabled={createMutation.isPending}
					>
						{t("common.cancel")}
					</Button>
					<Button
						onClick={() => createMutation.mutate()}
						disabled={!isFormValid || createMutation.isPending}
					>
						{createMutation.isPending ? (
							<>
								<Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
								{t("common.creating")}
							</>
						) : (
							<>
								<WrenchIcon className="mr-2 h-4 w-4" />
								{t("orders.internalMission.createTask")}
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
