"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Badge } from "@ui/components/badge";
import { Car, User, MapPin, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";
import type { Quote } from "../types";

/**
 * QuoteAssignmentInfo Component
 * 
 * Displays vehicle and driver assignment information for a quote.
 * Shows primary and second driver when assigned.
 * 
 * Story 20.8: Display second driver in quote details
 */
interface QuoteAssignmentInfoProps {
	quote: Quote;
	className?: string;
}

export function QuoteAssignmentInfo({ quote, className }: QuoteAssignmentInfoProps) {
	const t = useTranslations();

	// Extract assignment info from tripAnalysis.assignment or quote relations
	// This would need to be populated by the API when the quote is assigned
	const tripAnalysis = quote.tripAnalysis as {
		assignment?: {
			vehicleId: string | null;
			vehicleName: string | null;
			driverId: string | null;
			driverName: string | null;
			secondDriverId: string | null;
			secondDriverName: string | null;
			baseName: string | null;
		} | null;
	} | null;
	
	const assignment = tripAnalysis?.assignment;

	if (!assignment || !assignment.vehicleId) {
		return (
			<Card className={cn("", className)}>
				<CardHeader className="pb-3">
					<CardTitle className="text-base flex items-center gap-2">
						<Car className="size-4" />
						{t("quotes.assignment.title")}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-center py-4">
						<Badge variant="secondary" className="mb-2">
							{t("quotes.assignment.unassigned")}
						</Badge>
						<p className="text-sm text-muted-foreground">
							{t("quotes.assignment.unassignedDescription")}
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className={cn("", className)}>
			<CardHeader className="pb-3">
				<CardTitle className="text-base flex items-center gap-2">
					<Car className="size-4" />
					{t("quotes.assignment.title")}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					{/* Vehicle */}
					<div className="flex items-start gap-3">
						<div className="p-2 bg-muted rounded-md">
							<Car className="size-4 text-muted-foreground" />
						</div>
						<div className="flex-1">
							<div className="text-sm font-medium">{t("quotes.assignment.vehicle")}</div>
							<div className="text-sm text-muted-foreground">
								{assignment.vehicleName || t("quotes.assignment.unknownVehicle")}
							</div>
						</div>
					</div>

					{/* Primary Driver */}
					<div className="flex items-start gap-3">
						<div className="p-2 bg-muted rounded-md">
							<User className="size-4 text-muted-foreground" />
						</div>
						<div className="flex-1">
							<div className="text-sm font-medium">{t("quotes.assignment.driver")}</div>
							<div className="text-sm text-muted-foreground">
								{assignment.driverName || t("quotes.assignment.unassigned")}
							</div>
						</div>
					</div>

					{/* Second Driver (if assigned) */}
					{assignment.secondDriverName && (
						<div className="flex items-start gap-3">
							<div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-md">
								<Users className="size-4 text-blue-600 dark:text-blue-400" />
							</div>
							<div className="flex-1">
								<div className="text-sm font-medium">{t("quotes.assignment.secondDriver")}</div>
								<div className="text-sm text-muted-foreground">
									{assignment.secondDriverName}
								</div>
							</div>
						</div>
					)}

					{/* Base */}
					{assignment.baseName && (
						<div className="flex items-start gap-3">
							<div className="p-2 bg-muted rounded-md">
								<MapPin className="size-4 text-muted-foreground" />
							</div>
							<div className="flex-1">
								<div className="text-sm font-medium">{t("quotes.assignment.base")}</div>
								<div className="text-sm text-muted-foreground">
									{assignment.baseName}
								</div>
							</div>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

export default QuoteAssignmentInfo;
