"use client";

import { Alert, AlertDescription } from "@ui/components/alert";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/components/card";
import { Input } from "@ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { apiClient } from "@shared/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertCircleIcon,
	CheckCircle2Icon,
	FuelIcon,
	KeyIcon,
	Loader2Icon,
	MapIcon,
	PlayIcon,
	TrashIcon,
	XCircleIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useToast } from "@ui/hooks/use-toast";

interface IntegrationSettings {
	googleMapsApiKey: string | null;
	collectApiKey: string | null;
	hasGoogleMapsKey: boolean;
	hasCollectApiKey: boolean;
	preferredFuelType: string | null;
	googleMapsStatus: string | null;
	googleMapsTestedAt: string | null;
	collectApiStatus: string | null;
	collectApiTestedAt: string | null;
}

interface TestResult {
	success: boolean;
	status: string;
	latencyMs?: number;
	message: string;
	details?: {
		country?: string;
		gasoline?: number;
		diesel?: number;
		lpg?: number;
		currency?: string;
		address?: string;
		location?: { lat: number; lng: number };
	};
	error?: string;
}

function StatusBadge({ status }: { status: string | null }) {
	if (!status) {
		return (
			<Badge variant="outline" className="gap-1">
				<AlertCircleIcon className="size-3" />
				Unknown
			</Badge>
		);
	}

	switch (status) {
		case "connected":
			return (
				<Badge variant="success" className="gap-1">
					<CheckCircle2Icon className="size-3" />
					Connected
				</Badge>
			);
		case "invalid":
			return (
				<Badge variant="error" className="gap-1">
					<XCircleIcon className="size-3" />
					Invalid
				</Badge>
			);
		default:
			return (
				<Badge variant="outline" className="gap-1">
					<AlertCircleIcon className="size-3" />
					{status}
				</Badge>
			);
	}
}

export function IntegrationSettingsForm() {
	const t = useTranslations();
	const { toast } = useToast();
	const queryClient = useQueryClient();

	const [googleMapsKey, setGoogleMapsKey] = useState("");
	const [collectApiKey, setCollectApiKey] = useState("");
	const [testingGoogle, setTestingGoogle] = useState(false);
	const [testingCollect, setTestingCollect] = useState(false);
	const [googleTestResult, setGoogleTestResult] = useState<TestResult | null>(null);
	const [collectTestResult, setCollectTestResult] = useState<TestResult | null>(null);

	const { data: settings, isLoading, error } = useQuery({
		queryKey: ["integrationSettings"],
		queryFn: async () => {
			const response = await apiClient.vtc.settings.integrations.$get();
			if (!response.ok) {
				throw new Error("Failed to fetch integration settings");
			}
			const json = await response.json() as { data: IntegrationSettings };
			return json.data;
		},
	});

	const updateMutation = useMutation({
		mutationFn: async (data: { googleMapsApiKey?: string | null; collectApiKey?: string | null; preferredFuelType?: string }) => {
			const response = await apiClient.vtc.settings.integrations.$put({
				json: data,
			});
			if (!response.ok) {
				throw new Error("Failed to update integration settings");
			}
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["integrationSettings"] });
			setGoogleMapsKey("");
			setCollectApiKey("");
			setGoogleTestResult(null);
			setCollectTestResult(null);
			toast({ title: t("organizations.settings.integrations.notifications.updated") });
		},
		onError: () => {
			toast({ title: t("organizations.settings.integrations.notifications.updateFailed"), variant: "error" });
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (keyType: "googleMaps" | "collectApi") => {
			const response = await apiClient.vtc.settings.integrations[":keyType"].$delete({
				param: { keyType },
			});
			if (!response.ok) {
				throw new Error("Failed to delete API key");
			}
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["integrationSettings"] });
			setGoogleTestResult(null);
			setCollectTestResult(null);
			toast({ title: t("organizations.settings.integrations.notifications.deleted") });
		},
		onError: () => {
			toast({ title: t("organizations.settings.integrations.notifications.deleteFailed"), variant: "error" });
		},
	});

	const handleTestConnection = async (keyType: "googleMaps" | "collectApi") => {
		const setTesting = keyType === "googleMaps" ? setTestingGoogle : setTestingCollect;
		const setResult = keyType === "googleMaps" ? setGoogleTestResult : setCollectTestResult;

		setTesting(true);
		setResult(null);

		try {
			const response = await apiClient.vtc.settings.integrations.test[":keyType"].$post({
				param: { keyType },
			});

			const result = await response.json() as TestResult;
			setResult(result);

			// Refresh settings to get updated status
			queryClient.invalidateQueries({ queryKey: ["integrationSettings"] });

			if (result.success) {
				toast({
					title: t("organizations.settings.integrations.testConnection.success"),
					description: result.message,
				});
			} else {
				toast({
					title: t("organizations.settings.integrations.testConnection.failed"),
					description: result.error || result.message,
					variant: "error",
				});
			}
		} catch (err) {
			setResult({
				success: false,
				status: "error",
				message: "Failed to test connection",
				error: err instanceof Error ? err.message : "Unknown error",
			});
			toast({
				title: t("organizations.settings.integrations.testConnection.failed"),
				variant: "error",
			});
		} finally {
			setTesting(false);
		}
	};

	const handleUpdateGoogleMaps = () => {
		if (!googleMapsKey.trim()) return;
		updateMutation.mutate({ googleMapsApiKey: googleMapsKey });
	};

	const handleUpdateCollectApi = () => {
		if (!collectApiKey.trim()) return;
		updateMutation.mutate({ collectApiKey: collectApiKey });
	};

	const handleDeleteGoogleMaps = () => {
		if (confirm(t("organizations.settings.integrations.confirmDelete"))) {
			deleteMutation.mutate("googleMaps");
		}
	};

	const handleDeleteCollectApi = () => {
		if (confirm(t("organizations.settings.integrations.confirmDelete"))) {
			deleteMutation.mutate("collectApi");
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2Icon className="size-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (error) {
		return (
			<Alert variant="error">
				<AlertDescription>
					{t("organizations.settings.integrations.notifications.updateFailed")}
				</AlertDescription>
			</Alert>
		);
	}

	return (
		<div className="space-y-6">
			{/* Google Maps Integration */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="flex size-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
								<MapIcon className="size-5 text-blue-600 dark:text-blue-400" />
							</div>
							<div>
								<CardTitle className="text-lg">
									{t("organizations.settings.integrations.googleMaps.title")}
								</CardTitle>
								<CardDescription>
									{t("organizations.settings.integrations.googleMaps.description")}
								</CardDescription>
							</div>
						</div>
						<StatusBadge status={settings?.googleMapsStatus || null} />
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center gap-2">
						{settings?.hasGoogleMapsKey ? (
							<>
								<CheckCircle2Icon className="size-4 text-success" />
								<span className="text-sm text-muted-foreground">
									{t("organizations.settings.integrations.configured")}: {settings.googleMapsApiKey}
								</span>
								<Button
									variant="ghost"
									size="sm"
									onClick={handleDeleteGoogleMaps}
									disabled={deleteMutation.isPending}
								>
									<TrashIcon className="size-4" />
								</Button>
							</>
						) : (
							<>
								<XCircleIcon className="size-4 text-muted-foreground" />
								<span className="text-sm text-muted-foreground">
									{t("organizations.settings.integrations.notConfigured")}
								</span>
							</>
						)}
					</div>

					<div className="flex gap-2">
						<Input
							type="password"
							placeholder={t("organizations.settings.integrations.googleMaps.newKey")}
							value={googleMapsKey}
							onChange={(e) => setGoogleMapsKey(e.target.value)}
							className="max-w-md"
						/>
						<Button
							onClick={handleUpdateGoogleMaps}
							disabled={!googleMapsKey.trim() || updateMutation.isPending}
						>
							{updateMutation.isPending ? (
								<Loader2Icon className="size-4 animate-spin" />
							) : (
								<KeyIcon className="size-4" />
							)}
							{t("settings.save")}
						</Button>
					</div>

					{settings?.hasGoogleMapsKey && (
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								onClick={() => handleTestConnection("googleMaps")}
								disabled={testingGoogle}
							>
								{testingGoogle ? (
									<Loader2Icon className="size-4 animate-spin" />
								) : (
									<PlayIcon className="size-4" />
								)}
								{t("organizations.settings.integrations.testConnection.button")}
							</Button>

							{googleTestResult && (
								<span className={`text-sm ${googleTestResult.success ? "text-success" : "text-destructive"}`}>
									{googleTestResult.message}
									{googleTestResult.latencyMs && ` (${googleTestResult.latencyMs}ms)`}
								</span>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			{/* CollectAPI Integration */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="flex size-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
								<FuelIcon className="size-5 text-green-600 dark:text-green-400" />
							</div>
							<div>
								<CardTitle className="text-lg">
									{t("organizations.settings.integrations.collectApi.title")}
								</CardTitle>
								<CardDescription>
									{t("organizations.settings.integrations.collectApi.description")}
								</CardDescription>
							</div>
						</div>
						<StatusBadge status={settings?.collectApiStatus || null} />
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center gap-2">
						{settings?.hasCollectApiKey ? (
							<>
								<CheckCircle2Icon className="size-4 text-success" />
								<span className="text-sm text-muted-foreground">
									{t("organizations.settings.integrations.configured")}: {settings.collectApiKey}
								</span>
								<Button
									variant="ghost"
									size="sm"
									onClick={handleDeleteCollectApi}
									disabled={deleteMutation.isPending}
								>
									<TrashIcon className="size-4" />
								</Button>
							</>
						) : (
							<>
								<XCircleIcon className="size-4 text-muted-foreground" />
								<span className="text-sm text-muted-foreground">
									{t("organizations.settings.integrations.notConfigured")}
								</span>
							</>
						)}
					</div>

					<div className="flex gap-2">
						<Input
							type="password"
							placeholder={t("organizations.settings.integrations.collectApi.newKey")}
							value={collectApiKey}
							onChange={(e) => setCollectApiKey(e.target.value)}
							className="max-w-md"
						/>
						<Button
							onClick={handleUpdateCollectApi}
							disabled={!collectApiKey.trim() || updateMutation.isPending}
						>
							{updateMutation.isPending ? (
								<Loader2Icon className="size-4 animate-spin" />
							) : (
								<KeyIcon className="size-4" />
							)}
							{t("settings.save")}
						</Button>
					</div>

					{settings?.hasCollectApiKey && (
						<>
							<div className="flex items-center gap-4">
								<div className="flex items-center gap-2">
									<span className="text-sm font-medium">
										{t("organizations.settings.integrations.collectApi.fuelType")}:
									</span>
									<Select
										value={settings.preferredFuelType || "DIESEL"}
										onValueChange={(value) => {
											updateMutation.mutate({ preferredFuelType: value });
										}}
									>
										<SelectTrigger className="w-32">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="DIESEL">Diesel</SelectItem>
											<SelectItem value="GASOLINE">Gasoline</SelectItem>
											<SelectItem value="LPG">LPG</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>

							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									onClick={() => handleTestConnection("collectApi")}
									disabled={testingCollect}
								>
									{testingCollect ? (
										<Loader2Icon className="size-4 animate-spin" />
									) : (
										<PlayIcon className="size-4" />
									)}
									{t("organizations.settings.integrations.testConnection.button")}
								</Button>

								{collectTestResult && (
									<span className={`text-sm ${collectTestResult.success ? "text-success" : "text-destructive"}`}>
										{collectTestResult.message}
										{collectTestResult.latencyMs && ` (${collectTestResult.latencyMs}ms)`}
									</span>
								)}
							</div>

							{/* Show fuel prices if test was successful */}
							{collectTestResult?.success && collectTestResult.details && (
								<Alert>
									<FuelIcon className="size-4" />
									<AlertDescription>
										<div className="mt-1 grid grid-cols-3 gap-4 text-sm">
											<div>
												<span className="font-medium">Diesel:</span>{" "}
												{collectTestResult.details.diesel} {collectTestResult.details.currency}
											</div>
											<div>
												<span className="font-medium">Gasoline:</span>{" "}
												{collectTestResult.details.gasoline} {collectTestResult.details.currency}
											</div>
											<div>
												<span className="font-medium">LPG:</span>{" "}
												{collectTestResult.details.lpg} {collectTestResult.details.currency}
											</div>
										</div>
										<div className="mt-1 text-xs text-muted-foreground">
											{t("organizations.settings.integrations.collectApi.pricesFrom")} {collectTestResult.details.country}
										</div>
									</AlertDescription>
								</Alert>
							)}
						</>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
