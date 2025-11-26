"use client";

import { useState, useEffect, useCallback } from "react";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@ui/components/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/components/tabs";
import { useTranslations } from "next-intl";
import { User, ShieldCheck } from "lucide-react";
import { DriverForm } from "./DriverForm";
import { ComplianceSnapshot } from "./ComplianceSnapshot";
import { ComplianceAuditLogList } from "./ComplianceAuditLogList";
import type {
	DriverWithLicenses,
	ComplianceSnapshot as ComplianceSnapshotType,
	ComplianceAuditLog,
} from "../types";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";

interface DriverDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	driver?: DriverWithLicenses | null;
}

export function DriverDrawer({ open, onOpenChange, driver }: DriverDrawerProps) {
	const t = useTranslations();
	const { activeOrganization } = useActiveOrganization();
	const [activeTab, setActiveTab] = useState("details");
	const [complianceSnapshot, setComplianceSnapshot] = useState<ComplianceSnapshotType | null>(null);
	const [auditLogs, setAuditLogs] = useState<ComplianceAuditLog[]>([]);
	const [isLoadingCompliance, setIsLoadingCompliance] = useState(false);

	const fetchComplianceData = useCallback(async () => {
		if (!driver || !activeOrganization?.slug) return;

		setIsLoadingCompliance(true);
		try {
			const [snapshotRes, logsRes] = await Promise.all([
				fetch(`/api/vtc/drivers/${driver.id}/compliance-snapshot`),
				fetch(`/api/vtc/drivers/${driver.id}/compliance-logs?limit=10`),
			]);

			if (snapshotRes.ok) {
				const snapshot = await snapshotRes.json();
				setComplianceSnapshot(snapshot);
			}

			if (logsRes.ok) {
				const logsData = await logsRes.json();
				setAuditLogs(logsData.data || []);
			}
		} catch (error) {
			console.error("Failed to fetch compliance data:", error);
		} finally {
			setIsLoadingCompliance(false);
		}
	}, [driver, activeOrganization?.slug]);

	// Fetch compliance data when driver changes and tab is compliance
	useEffect(() => {
		if (driver && activeTab === "compliance" && activeOrganization?.slug) {
			fetchComplianceData();
		}
	}, [driver, activeTab, activeOrganization?.slug, fetchComplianceData]);

	const handleSuccess = () => {
		onOpenChange(false);
	};

	const handleCancel = () => {
		onOpenChange(false);
	};

	// Reset tab when drawer closes
	useEffect(() => {
		if (!open) {
			setActiveTab("details");
			setComplianceSnapshot(null);
			setAuditLogs([]);
		}
	}, [open]);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="sm:max-w-xl overflow-y-auto">
				<SheetHeader>
					<SheetTitle>
						{driver ? t("fleet.drivers.editDriver") : t("fleet.drivers.addDriver")}
					</SheetTitle>
					<SheetDescription>
						{driver
							? t("fleet.drivers.editDriverDescription")
							: t("fleet.drivers.addDriverDescription")}
					</SheetDescription>
				</SheetHeader>

				{driver ? (
					<Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
						<TabsList className="grid w-full grid-cols-2">
							<TabsTrigger value="details" className="flex items-center gap-2">
								<User className="h-4 w-4" />
								{t("fleet.drivers.form.personalInfo")}
							</TabsTrigger>
							<TabsTrigger value="compliance" className="flex items-center gap-2">
								<ShieldCheck className="h-4 w-4" />
								{t("fleet.compliance.snapshotTitle")}
							</TabsTrigger>
						</TabsList>

						<TabsContent value="details" className="mt-4">
							<DriverForm
								driver={driver}
								onSuccess={handleSuccess}
								onCancel={handleCancel}
							/>
						</TabsContent>

						<TabsContent value="compliance" className="mt-4 space-y-4">
							<ComplianceSnapshot
								snapshot={complianceSnapshot}
								isLoading={isLoadingCompliance}
							/>
							<ComplianceAuditLogList
								logs={auditLogs}
								isLoading={isLoadingCompliance}
							/>
						</TabsContent>
					</Tabs>
				) : (
					<div className="mt-6">
						<DriverForm
							driver={driver}
							onSuccess={handleSuccess}
							onCancel={handleCancel}
						/>
					</div>
				)}
			</SheetContent>
		</Sheet>
	);
}
