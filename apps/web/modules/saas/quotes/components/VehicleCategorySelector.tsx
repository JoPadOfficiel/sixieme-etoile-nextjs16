"use client";

import { apiClient } from "@shared/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import { Label } from "@ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { Skeleton } from "@ui/components/skeleton";
import { cn } from "@ui/lib";
import { CarIcon, TruckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { VehicleCategory } from "../types";

export interface VehicleCategorySelectorProps {
	value: string | string[];
	onChange?: (categoryId: string, category: VehicleCategory | null) => void;
	onMultiChange?: (categoryIds: string[]) => void;
	disabled?: boolean;
	required?: boolean;
	className?: string;
	mode?: "single" | "multiple";
	categories?: VehicleCategory[];
}

interface VehicleCategoriesResponse {
	data: VehicleCategory[];
	meta: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

/**
 * VehicleCategorySelector Component
 *
 * Select dropdown for vehicle categories with regulatory category indicator.
 *
 * @see Story 6.2: Create Quote 3-Column Cockpit
 */
export function VehicleCategorySelector({
	value,
	onChange,
	onMultiChange,
	disabled = false,
	required = false,
	className,
	mode = "single",
	categories: passedCategories,
}: VehicleCategorySelectorProps) {
	const t = useTranslations();

	// Fetch vehicle categories only if not provided
	const { data, isLoading } = useQuery({
		queryKey: ["vehicle-categories"],
		queryFn: async () => {
			const response = await apiClient.vtc["vehicle-categories"].$get({
				query: { limit: "50" },
			});
			if (!response.ok) {
				throw new Error("Failed to fetch vehicle categories");
			}
			return response.json() as Promise<VehicleCategoriesResponse>;
		},
		enabled: !passedCategories,
	});

	const categories = passedCategories ?? data?.data ?? [];

	const handleSingleChange = (categoryId: string) => {
		const category = categories.find((c) => c.id === categoryId) ?? null;
		onChange?.(categoryId, category);
	};

	const handleMultiChange = (categoryId: string, checked: boolean) => {
		if (!onMultiChange) return;
		const currentValues = Array.isArray(value) ? value : [];
		if (checked) {
			onMultiChange([...currentValues, categoryId]);
		} else {
			onMultiChange(currentValues.filter((id) => id !== categoryId));
		}
	};

	const selectedCategory = !Array.isArray(value)
		? categories.find((c) => c.id === value)
		: null;

	const selectedCategories = Array.isArray(value)
		? categories.filter((c) => value.includes(c.id))
		: [];

	if (isLoading) {
		return (
			<div className={cn("space-y-2", className)}>
				<Label>
					{t("quotes.create.vehicleCategory")}
					{required && <span className="ml-1 text-destructive">*</span>}
				</Label>
				<Skeleton className="h-10 w-full" />
			</div>
		);
	}

	return (
		<div className={cn("space-y-2", className)}>
			<Label>
				{t("quotes.create.vehicleCategory")}
				{required && <span className="ml-1 text-destructive">*</span>}
			</Label>

			{mode === "multiple" ? (
				<DropdownMenu>
					<DropdownMenuTrigger asChild disabled={disabled}>
						<Button
							variant="outline"
							className="w-full justify-start text-left font-normal"
						>
							{selectedCategories.length === 0 ? (
								<span className="text-muted-foreground">
									{t("quotes.create.selectVehicleCategory")}
								</span>
							) : selectedCategories.length === categories.length ? (
								<span>Tous ({selectedCategories.length})</span>
							) : (
								<div className="flex flex-wrap gap-1">
									{selectedCategories.length > 2 ? (
										<span>{selectedCategories.length} sélectionnés</span>
									) : (
										selectedCategories.map((cat) => (
											<Badge key={cat.id} variant="secondary" className="mr-1">
												{cat.name}
											</Badge>
										))
									)}
								</div>
							)}
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent className="w-full min-w-[300px]" align="start">
						{categories.length === 0 ? (
							<div className="p-2 text-center text-muted-foreground text-sm">
								{t("quotes.create.noVehicleCategories")}
							</div>
						) : (
							categories.map((category) => (
								<DropdownMenuCheckboxItem
									key={category.id}
									checked={Array.isArray(value) && value.includes(category.id)}
									onCheckedChange={(checked) =>
										handleMultiChange(category.id, checked)
									}
								>
									<div className="flex w-full items-center gap-2">
										{category.regulatoryCategory === "HEAVY" ? (
											<TruckIcon className="size-4 text-muted-foreground" />
										) : (
											<CarIcon className="size-4 text-muted-foreground" />
										)}
										<span>{category.name}</span>
										<Badge
											variant={
												category.regulatoryCategory === "HEAVY"
													? "destructive"
													: "secondary"
											}
											className="ml-auto text-xs"
										>
											{category.regulatoryCategory}
										</Badge>
									</div>
								</DropdownMenuCheckboxItem>
							))
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			) : (
				<Select
					value={value as string}
					onValueChange={handleSingleChange}
					disabled={disabled}
				>
					<SelectTrigger className="w-full">
						<SelectValue placeholder={t("quotes.create.selectVehicleCategory")}>
							{selectedCategory && (
								<div className="flex items-center gap-2">
									{selectedCategory.regulatoryCategory === "HEAVY" ? (
										<TruckIcon className="size-4 text-muted-foreground" />
									) : (
										<CarIcon className="size-4 text-muted-foreground" />
									)}
									<span>{selectedCategory.name}</span>
									<Badge
										variant={
											selectedCategory.regulatoryCategory === "HEAVY"
												? "destructive"
												: "secondary"
										}
										className="text-xs"
									>
										{selectedCategory.regulatoryCategory}
									</Badge>
								</div>
							)}
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						{categories.length === 0 ? (
							<div className="p-2 text-center text-muted-foreground text-sm">
								{t("quotes.create.noVehicleCategories")}
							</div>
						) : (
							categories.map((category) => (
								<SelectItem key={category.id} value={category.id}>
									<div className="flex items-center gap-2">
										{category.regulatoryCategory === "HEAVY" ? (
											<TruckIcon className="size-4 text-muted-foreground" />
										) : (
											<CarIcon className="size-4 text-muted-foreground" />
										)}
										<span>{category.name}</span>
										<Badge
											variant={
												category.regulatoryCategory === "HEAVY"
													? "destructive"
													: "secondary"
											}
											className="ml-auto text-xs"
										>
											{category.regulatoryCategory}
										</Badge>
									</div>
								</SelectItem>
							))
						)}
					</SelectContent>
				</Select>
			)}
		</div>
	);
}

export default VehicleCategorySelector;
