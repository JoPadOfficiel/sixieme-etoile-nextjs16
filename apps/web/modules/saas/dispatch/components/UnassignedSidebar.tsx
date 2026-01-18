"use client";

import { useVehicleCategories } from "@saas/quotes/hooks/useVehicleCategories";
import { Badge } from "@ui/components/badge";
import { Input } from "@ui/components/input";
import { ScrollArea } from "@ui/components/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { cn } from "@ui/lib";
import { Inbox, Search, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import { useMissions } from "../hooks/useMissions";
import { MissionsList } from "./MissionsList";

interface UnassignedSidebarProps {
	selectedMissionId: string | null;
	onSelectMission: (missionId: string) => void;
	isCollapsed?: boolean;
}

export function UnassignedSidebar({
	selectedMissionId,
	onSelectMission,
	isCollapsed = false,
}: UnassignedSidebarProps) {
	const t = useTranslations("dispatch");
	const [searchInput, setSearchInput] = useState("");
	const [search] = useDebounceValue(searchInput, 500);
	const [vehicleCategoryId, setVehicleCategoryId] = useState<
		string | undefined
	>(undefined);

	// Fetch unassigned missions
	const { data: missionsData, isLoading } = useMissions({
		filters: {
			unassignedOnly: true,
			search,
			vehicleCategoryId,
		},
		limit: 100, // Load more for backlog
	});

	const { categories: vehicleCategories = [] } = useVehicleCategories();
	const missions = missionsData?.data || [];
	const totalCount = missionsData?.meta.total || 0;

	return (
		<div className="relative flex h-full flex-col bg-background transition-all duration-300">
			<div
				className={cn(
					"flex-none space-y-4 border-b p-4",
					isCollapsed && "space-y-2 border-b-0 p-2",
				)}
			>
				<div
					className={cn(
						"flex items-center justify-between",
						isCollapsed && "justify-center",
					)}
				>
					{!isCollapsed ? (
						<h2 className="flex items-center gap-2 font-semibold text-muted-foreground text-sm uppercase tracking-wider">
							<Inbox className="size-4" />
							{t("sidebar.backlog")} ({totalCount})
						</h2>
					) : (
						<div className="group relative">
							<Badge
								variant="secondary"
								className="flex size-8 items-center justify-center rounded-full p-0"
							>
								{totalCount > 99 ? "99+" : totalCount}
							</Badge>
						</div>
					)}
				</div>

				{!isCollapsed && (
					<div className="space-y-2">
						{/* Search */}
						<div className="relative">
							<Search className="absolute top-2.5 left-2 size-4 text-muted-foreground" />
							<Input
								placeholder={t("filters.searchPlaceholder")}
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
								className="pl-8"
							/>
						</div>

						{/* Category Filter */}
						<Select
							value={vehicleCategoryId || "all"}
							onValueChange={(val) =>
								setVehicleCategoryId(val === "all" ? undefined : val)
							}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder={t("filters.vehicleCategory")} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">{t("filters.all")}</SelectItem>
								{vehicleCategories.map((cat) => (
									<SelectItem key={cat.id} value={cat.id}>
										{cat.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}

				{isCollapsed && (
					<div className="flex justify-center">
						<SlidersHorizontal className="size-4 text-muted-foreground opacity-50" />
					</div>
				)}
			</div>

			<div className="min-h-0 flex-1">
				<ScrollArea className="h-full">
					<div className={cn("p-2", isCollapsed && "px-1")}>
						{isCollapsed ? (
							// Collapsed view - generic indicators
							<div className="flex flex-col items-center gap-2 pt-2">
								{missions.length > 0 ? (
									missions
										.slice(0, 5)
										.map((m) => (
											<div
												key={m.id}
												className={cn(
													"size-2 rounded-full bg-primary",
													selectedMissionId === m.id &&
														"ring-2 ring-primary ring-offset-2",
												)}
												title={m.pickupAddress}
											/>
										))
								) : (
									<span className="text-muted-foreground text-xs">-</span>
								)}
							</div>
						) : (
							<MissionsList
								missions={missions}
								selectedMissionId={selectedMissionId}
								onSelectMission={onSelectMission}
								isLoading={isLoading}
								className="border-none shadow-none"
							/>
						)}
					</div>
				</ScrollArea>
			</div>
		</div>
	);
}
