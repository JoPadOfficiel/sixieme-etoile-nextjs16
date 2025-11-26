"use client";

import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Skeleton } from "@ui/components/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@ui/components/tooltip";
import { cn } from "@ui/lib";
import {
	ArrowLeftRightIcon,
	ArrowRightIcon,
	CircleDotIcon,
	GridIcon,
	PlusIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

export type ScenarioType =
	| "INTRA_ZONE"
	| "RADIAL"
	| "CIRCULAR_SUBURBAN"
	| "VERSAILLES"
	| "STANDARD";

export interface MatrixCell {
	hasRoute: boolean;
	routeId?: string;
	routeName?: string;
	price?: number;
	direction?: "BIDIRECTIONAL" | "A_TO_B" | "B_TO_A";
	isActive?: boolean;
	vehicleCategoryId?: string;
	vehicleCategoryName?: string;
	scenarioType?: ScenarioType;
}

export interface MatrixZone {
	id: string;
	name: string;
	code: string;
	zoneType: string;
}

export interface MatrixData {
	zones: MatrixZone[];
	matrix: {
		[fromZoneId: string]: {
			[toZoneId: string]: MatrixCell | null;
		};
	};
	scenarios: {
		intraZone: string[];
		radial: string[];
		circularSuburban: string[];
		versailles: string[];
	};
}

interface CoverageMatrixProps {
	data: MatrixData | null;
	isLoading: boolean;
	onCellClick?: (fromZoneId: string, toZoneId: string, cell: MatrixCell | null) => void;
}

function ScenarioBadge({ scenario }: { scenario: ScenarioType }) {
	const t = useTranslations();

	if (scenario === "STANDARD") return null;

	const config: Record<Exclude<ScenarioType, "STANDARD">, { label: string; className: string }> = {
		INTRA_ZONE: {
			label: t("routes.scenarios.intraZone"),
			className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
		},
		RADIAL: {
			label: t("routes.scenarios.radial"),
			className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
		},
		CIRCULAR_SUBURBAN: {
			label: t("routes.scenarios.circularSuburban"),
			className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
		},
		VERSAILLES: {
			label: t("routes.scenarios.versailles"),
			className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
		},
	};

	const cfg = config[scenario];

	return (
		<Badge variant="outline" className={cn("text-[10px] px-1 py-0", cfg.className)}>
			{cfg.label}
		</Badge>
	);
}

function MatrixCellComponent({
	cell,
	isSameZone,
	onClick,
}: {
	cell: MatrixCell | null;
	isSameZone: boolean;
	onClick?: () => void;
}) {
	const t = useTranslations();

	if (isSameZone && !cell?.hasRoute) {
		return (
			<div className="flex size-full items-center justify-center bg-muted/50">
				<span className="text-muted-foreground text-xs">-</span>
			</div>
		);
	}

	if (!cell?.hasRoute) {
		return (
			<Button
				variant="ghost"
				size="sm"
				className="size-full rounded-none hover:bg-red-50 dark:hover:bg-red-950"
				onClick={onClick}
			>
				<PlusIcon className="size-3 text-muted-foreground" />
			</Button>
		);
	}

	const directionIcon =
		cell.direction === "BIDIRECTIONAL" ? (
			<ArrowLeftRightIcon className="size-3" />
		) : (
			<ArrowRightIcon className="size-3" />
		);

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className={cn(
							"size-full flex-col gap-0.5 rounded-none p-1",
							cell.isActive
								? "bg-green-50 hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900"
								: "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700",
						)}
						onClick={onClick}
					>
						<div className="flex items-center gap-1">
							{directionIcon}
							<span className="font-medium text-xs">
								{cell.price?.toFixed(0)}
							</span>
						</div>
						{cell.scenarioType && cell.scenarioType !== "STANDARD" && (
							<ScenarioBadge scenario={cell.scenarioType} />
						)}
					</Button>
				</TooltipTrigger>
				<TooltipContent side="top" className="max-w-xs">
					<div className="space-y-1">
						<p className="font-medium">{cell.routeName}</p>
						<p className="text-sm">
							{t("routes.matrix.price")}: {cell.price?.toFixed(2)} EUR
						</p>
						<p className="text-sm">
							{t("routes.matrix.direction")}:{" "}
							{t(`routes.directions.${cell.direction?.toLowerCase()}`)}
						</p>
						{cell.vehicleCategoryName && (
							<p className="text-sm">
								{t("routes.matrix.category")}: {cell.vehicleCategoryName}
							</p>
						)}
						<p className="text-sm">
							{t("routes.matrix.status")}:{" "}
							{cell.isActive ? t("common.active") : t("common.inactive")}
						</p>
					</div>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

export function CoverageMatrix({ data, isLoading, onCellClick }: CoverageMatrixProps) {
	const t = useTranslations();

	if (isLoading) {
		return (
			<Card>
				<CardHeader className="pb-2">
					<Skeleton className="h-5 w-40" />
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-6 gap-1">
						{Array.from({ length: 36 }).map((_, i) => (
							<Skeleton key={i} className="h-12" />
						))}
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!data || data.zones.length === 0) {
		return (
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="flex items-center gap-2 text-base">
						<GridIcon className="size-4" />
						{t("routes.matrix.title")}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-center text-muted-foreground py-8">
						{t("routes.matrix.noZones")}
					</p>
				</CardContent>
			</Card>
		);
	}

	const { zones, matrix, scenarios } = data;

	return (
		<Card>
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2 text-base">
						<GridIcon className="size-4" />
						{t("routes.matrix.title")}
					</CardTitle>
					<div className="flex gap-2 text-xs">
						<Badge variant="outline" className="bg-blue-50 dark:bg-blue-950">
							<CircleDotIcon className="mr-1 size-3" />
							{t("routes.scenarios.intraZone")} ({scenarios.intraZone.length})
						</Badge>
						<Badge variant="outline" className="bg-green-50 dark:bg-green-950">
							<ArrowLeftRightIcon className="mr-1 size-3" />
							{t("routes.scenarios.radial")} ({scenarios.radial.length})
						</Badge>
					</div>
				</div>
			</CardHeader>
			<CardContent className="overflow-x-auto">
				<div className="min-w-max">
					{/* Header row */}
					<div
						className="grid gap-px bg-border"
						style={{
							gridTemplateColumns: `120px repeat(${zones.length}, minmax(80px, 1fr))`,
						}}
					>
						{/* Empty corner cell */}
						<div className="bg-background p-2 font-medium text-xs">
							{t("routes.matrix.fromTo")}
						</div>
						{/* Column headers (To zones) */}
						{zones.map((zone) => (
							<div
								key={`header-${zone.id}`}
								className="bg-background p-2 text-center font-medium text-xs truncate"
								title={zone.name}
							>
								{zone.code || zone.name.slice(0, 8)}
							</div>
						))}
					</div>

					{/* Data rows */}
					{zones.map((fromZone) => (
						<div
							key={`row-${fromZone.id}`}
							className="grid gap-px bg-border"
							style={{
								gridTemplateColumns: `120px repeat(${zones.length}, minmax(80px, 1fr))`,
							}}
						>
							{/* Row header (From zone) */}
							<div
								className="bg-background p-2 font-medium text-xs truncate"
								title={fromZone.name}
							>
								{fromZone.code || fromZone.name.slice(0, 12)}
							</div>
							{/* Cells */}
							{zones.map((toZone) => {
								const cell = matrix[fromZone.id]?.[toZone.id] ?? null;
								const isSameZone = fromZone.id === toZone.id;

								return (
									<div
										key={`cell-${fromZone.id}-${toZone.id}`}
										className="bg-background h-14"
									>
										<MatrixCellComponent
											cell={cell}
											isSameZone={isSameZone}
											onClick={() => onCellClick?.(fromZone.id, toZone.id, cell)}
										/>
									</div>
								);
							})}
						</div>
					))}
				</div>

				{/* Legend */}
				<div className="mt-4 flex flex-wrap gap-4 border-t pt-4 text-xs text-muted-foreground">
					<div className="flex items-center gap-1">
						<div className="size-4 rounded bg-green-100 dark:bg-green-900" />
						<span>{t("routes.matrix.legend.activeRoute")}</span>
					</div>
					<div className="flex items-center gap-1">
						<div className="size-4 rounded bg-gray-100 dark:bg-gray-800" />
						<span>{t("routes.matrix.legend.inactiveRoute")}</span>
					</div>
					<div className="flex items-center gap-1">
						<PlusIcon className="size-4" />
						<span>{t("routes.matrix.legend.missingRoute")}</span>
					</div>
					<div className="flex items-center gap-1">
						<ArrowLeftRightIcon className="size-4" />
						<span>{t("routes.matrix.legend.bidirectional")}</span>
					</div>
					<div className="flex items-center gap-1">
						<ArrowRightIcon className="size-4" />
						<span>{t("routes.matrix.legend.oneWay")}</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
