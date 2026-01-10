"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { User, Building2, Mail, Phone, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@ui/components/badge";
import { cn } from "@ui/lib";
import type { MissionListItem } from "../types";

/**
 * MissionContactPanel Component
 *
 * Story 24.7: Integrate EndCustomer in dispatch interface
 *
 * Displays contact information for both the booking agency (Partner)
 * and the end customer (passenger) if available.
 */

interface MissionContactPanelProps {
	mission: MissionListItem | null;
	isLoading?: boolean;
	className?: string;
}

export function MissionContactPanel({
	mission,
	isLoading = false,
	className,
}: MissionContactPanelProps) {
	const t = useTranslations("dispatch.missions");

	if (isLoading) {
		return (
			<Card className={cn("", className)}>
				<CardHeader className="pb-3">
					<div className="h-5 w-32 bg-muted animate-spin rounded" />
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="h-10 bg-muted animate-spin rounded" />
					<div className="h-10 bg-muted animate-spin rounded" />
				</CardContent>
			</Card>
		);
	}

	if (!mission) return null;

	const { contact, endCustomer } = mission;

	return (
		<Card className={cn("", className)} data-testid="mission-contact-panel">
			<CardHeader className="pb-3">
				<CardTitle className="text-base font-semibold flex items-center gap-2">
					<Users className="size-4" />
					{t("contactTitle", { defaultValue: "Contacts" })}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Agency Section */}
				<div className="space-y-2">
					<div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
						<Building2 className="size-3.5" />
						{contact.isPartner ? t("partner") : t("private")}
					</div>
					<div className="pl-5.5 space-y-1">
						<div className="text-sm font-semibold">{contact.displayName}</div>
						{contact.email && (
							<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
								<Mail className="size-3" />
								<span>{contact.email}</span>
							</div>
						)}
						{contact.phone && (
							<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
								<Phone className="size-3" />
								<span>{contact.phone}</span>
							</div>
						)}
					</div>
				</div>

				{/* End Customer Section */}
				{endCustomer && (
					<div className="pt-3 border-t space-y-2">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2 text-sm font-medium text-primary">
								<User className="size-3.5" />
								{t("endCustomerLabel", { defaultValue: "Client Final (Passager)" })}
							</div>
							<Badge variant="secondary" className="text-[10px] px-1.5 py-0">
								{t("passenger", { defaultValue: "Passager" })}
							</Badge>
						</div>
						<div className="pl-5.5 space-y-1">
							<div className="text-sm font-semibold">
								{endCustomer.firstName} {endCustomer.lastName}
							</div>
							{endCustomer.email && (
								<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
									<Mail className="size-3" />
									<span>{endCustomer.email}</span>
								</div>
							)}
							{endCustomer.phone && (
								<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
									<Phone className="size-3" />
									<span>{endCustomer.phone}</span>
								</div>
							)}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

import { Users } from "lucide-react";

export default MissionContactPanel;
