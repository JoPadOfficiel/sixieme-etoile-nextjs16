"use client";

import { config } from "@repo/config";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { SettingsItem } from "@saas/shared/components/SettingsItem";
import { useSignedUploadUrlMutation } from "@saas/shared/lib/api";
import { Spinner } from "@shared/components/Spinner";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { useToast } from "@ui/hooks/use-toast";
import { cn } from "@ui/lib";
import { AlignLeft, AlignRight, ImageIcon, Trash2 } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { v4 as uuid } from "uuid";

// API client for pricing settings
async function getPricingSettings(organizationId: string): Promise<{
	documentLogoUrl: string | null;
	brandColor: string;
	logoPosition: "LEFT" | "RIGHT";
} | null> {
	const response = await fetch(`/api/vtc/pricing-settings`, {
		headers: { "x-organization-id": organizationId },
	});
	if (!response.ok) return null;
	const data = await response.json();
	return data
		? {
				documentLogoUrl: data.documentLogoUrl,
				brandColor: data.brandColor ?? "#2563eb",
				logoPosition: data.logoPosition ?? "LEFT",
		  }
		: null;
}

async function updatePricingSettings(
	organizationId: string,
	data: {
		documentLogoUrl?: string | null;
		brandColor?: string;
		logoPosition?: "LEFT" | "RIGHT";
	}
): Promise<boolean> {
	const response = await fetch(`/api/vtc/pricing-settings`, {
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
			"x-organization-id": organizationId,
		},
		body: JSON.stringify(data),
	});
	return response.ok;
}

export function DocumentSettingsForm() {
	const { toast } = useToast();
	const t = useTranslations();
	const { activeOrganization } = useActiveOrganization();
	const getSignedUploadUrlMutation = useSignedUploadUrlMutation();

	// State
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [documentLogoUrl, setDocumentLogoUrl] = useState<string | null>(null);
	const [brandColor, setBrandColor] = useState("#2563eb");
	const [logoPosition, setLogoPosition] = useState<"LEFT" | "RIGHT">("LEFT");

	// Load current settings
	useEffect(() => {
		if (!activeOrganization) return;

		const loadSettings = async () => {
			setLoading(true);
			try {
				const settings = await getPricingSettings(activeOrganization.id);
				if (settings) {
					setDocumentLogoUrl(settings.documentLogoUrl);
					setBrandColor(settings.brandColor);
					setLogoPosition(settings.logoPosition);
				}
			} catch (error) {
				console.error("Failed to load document settings:", error);
			} finally {
				setLoading(false);
			}
		};

		loadSettings();
	}, [activeOrganization]);

	// Handle logo upload
	const onDrop = useCallback(
		async (acceptedFiles: File[]) => {
			if (!activeOrganization || acceptedFiles.length === 0) return;

			const file = acceptedFiles[0];
			if (file.size > 2 * 1024 * 1024) {
				toast({
					variant: "error",
					title: t("settings.documentSettings.logo.fileTooLarge"),
				});
				return;
			}

			setUploading(true);
			try {
				const path = `${activeOrganization.id}/${uuid()}.png`;
				const { signedUrl } = await getSignedUploadUrlMutation.mutateAsync({
					path,
					bucket: config.storage.bucketNames.documentLogos,
				});

				const response = await fetch(signedUrl, {
					method: "PUT",
					body: file,
					headers: { "Content-Type": file.type },
				});

				if (!response.ok) {
					throw new Error("Failed to upload image");
				}

				setDocumentLogoUrl(path);
				
				// Auto-save after upload
				const success = await updatePricingSettings(activeOrganization.id, {
					documentLogoUrl: path,
				});

				if (success) {
					toast({
						variant: "success",
						title: t("settings.documentSettings.logo.uploadSuccess"),
					});
				}
			} catch (error) {
				console.error("Upload failed:", error);
				toast({
					variant: "error",
					title: t("settings.documentSettings.logo.uploadError"),
				});
			} finally {
				setUploading(false);
			}
		},
		[activeOrganization, getSignedUploadUrlMutation, t, toast]
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			"image/png": [".png"],
			"image/jpeg": [".jpg", ".jpeg"],
		},
		multiple: false,
		maxSize: 2 * 1024 * 1024,
	});

	// Handle logo removal
	const handleRemoveLogo = async () => {
		if (!activeOrganization) return;

		setSaving(true);
		try {
			const success = await updatePricingSettings(activeOrganization.id, {
				documentLogoUrl: null,
			});

			if (success) {
				setDocumentLogoUrl(null);
				toast({
					variant: "success",
					title: t("settings.documentSettings.logo.removeSuccess"),
				});
			}
		} catch {
			toast({
				variant: "error",
				title: t("settings.documentSettings.logo.removeError"),
			});
		} finally {
			setSaving(false);
		}
	};

	// Handle brand color change
	const handleBrandColorChange = async (newColor: string) => {
		setBrandColor(newColor);
	};

	// Handle brand color save (on blur)
	const handleBrandColorSave = async () => {
		if (!activeOrganization) return;

		// Validate hex format
		if (!/^#[0-9A-Fa-f]{6}$/.test(brandColor)) {
			toast({
				variant: "error",
				title: t("settings.documentSettings.brandColor.invalidFormat"),
			});
			return;
		}

		setSaving(true);
		try {
			const success = await updatePricingSettings(activeOrganization.id, {
				brandColor,
			});

			if (success) {
				toast({
					variant: "success",
					title: t("settings.documentSettings.brandColor.saveSuccess"),
				});
			}
		} catch {
			toast({
				variant: "error",
				title: t("settings.documentSettings.brandColor.saveError"),
			});
		} finally {
			setSaving(false);
		}
	};

	// Handle logo position change
	const handleLogoPositionChange = async (position: "LEFT" | "RIGHT") => {
		if (!activeOrganization) return;

		setLogoPosition(position);
		setSaving(true);
		try {
			const success = await updatePricingSettings(activeOrganization.id, {
				logoPosition: position,
			});

			if (success) {
				toast({
					variant: "success",
					title: t("settings.documentSettings.logoPosition.saveSuccess"),
				});
			}
		} catch {
			setLogoPosition(logoPosition === "LEFT" ? "RIGHT" : "LEFT"); // Revert
			toast({
				variant: "error",
				title: t("settings.documentSettings.logoPosition.saveError"),
			});
		} finally {
			setSaving(false);
		}
	};

	if (!activeOrganization) {
		return null;
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Spinner className="size-6" />
			</div>
		);
	}

	const logoUrl = documentLogoUrl
		? `/image-proxy/${config.storage.bucketNames.documentLogos}/${documentLogoUrl}`
		: null;

	return (
		<div className="space-y-8">
			{/* Document Logo Upload */}
			<SettingsItem
				title={t("settings.documentSettings.logo.title")}
				description={t("settings.documentSettings.logo.description")}
			>
				<div className="flex items-start gap-4">
					{/* Logo Preview / Upload Zone */}
					<div
						{...getRootProps()}
						className={cn(
							"relative flex h-24 w-48 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors",
							isDragActive
								? "border-primary bg-primary/5"
								: "border-border hover:border-primary/50",
							uploading && "pointer-events-none opacity-50"
						)}
					>
						<input {...getInputProps()} />
						{uploading ? (
							<Spinner className="size-6" />
						) : logoUrl ? (
							<Image
								src={logoUrl}
								alt="Document Logo"
								fill
								className="object-contain p-2"
							/>
						) : (
							<div className="flex flex-col items-center gap-1 text-muted-foreground">
								<ImageIcon className="size-8" />
								<span className="text-xs">
									{t("settings.documentSettings.logo.dropzone")}
								</span>
							</div>
						)}
					</div>

					{/* Remove Button */}
					{documentLogoUrl && (
						<Button
							variant="outline"
							size="icon"
							onClick={handleRemoveLogo}
							disabled={saving}
						>
							<Trash2 className="size-4" />
						</Button>
					)}
				</div>
			</SettingsItem>

			{/* Brand Color */}
			<SettingsItem
				title={t("settings.documentSettings.brandColor.title")}
				description={t("settings.documentSettings.brandColor.description")}
			>
				<div className="flex items-center gap-3">
					<div
						className="size-10 rounded-lg border shadow-sm"
						style={{ backgroundColor: brandColor }}
					/>
					<Input
						type="color"
						value={brandColor}
						onChange={(e) => handleBrandColorChange(e.target.value)}
						onBlur={handleBrandColorSave}
						className="h-10 w-20 cursor-pointer p-1"
					/>
					<Input
						type="text"
						value={brandColor}
						onChange={(e) => handleBrandColorChange(e.target.value)}
						onBlur={handleBrandColorSave}
						placeholder="#2563eb"
						className="w-28 font-mono"
						maxLength={7}
					/>
				</div>
			</SettingsItem>

			{/* Logo Position */}
			<SettingsItem
				title={t("settings.documentSettings.logoPosition.title")}
				description={t("settings.documentSettings.logoPosition.description")}
			>
				<div className="flex gap-2">
					<Button
						variant={logoPosition === "LEFT" ? "default" : "outline"}
						size="sm"
						onClick={() => handleLogoPositionChange("LEFT")}
						disabled={saving}
						className="gap-2"
					>
						<AlignLeft className="size-4" />
						{t("settings.documentSettings.logoPosition.left")}
					</Button>
					<Button
						variant={logoPosition === "RIGHT" ? "default" : "outline"}
						size="sm"
						onClick={() => handleLogoPositionChange("RIGHT")}
						disabled={saving}
						className="gap-2"
					>
						<AlignRight className="size-4" />
						{t("settings.documentSettings.logoPosition.right")}
					</Button>
				</div>
			</SettingsItem>

			{/* Preview Section */}
			<SettingsItem
				title={t("settings.documentSettings.preview.title")}
				description={t("settings.documentSettings.preview.description")}
			>
				<div className="relative w-full max-w-md rounded-lg border bg-white p-4 shadow-sm">
					{/* Mini PDF Preview */}
					<div className="flex items-start justify-between gap-4">
						{/* Left Side */}
						<div className={cn(logoPosition === "RIGHT" && "order-2")}>
							{logoUrl ? (
								<Image
									src={logoUrl}
									alt="Logo Preview"
									width={80}
									height={40}
									className="object-contain"
								/>
							) : (
								<div className="flex h-10 w-20 items-center justify-center rounded border border-dashed text-xs text-muted-foreground">
									Logo
								</div>
							)}
						</div>

						{/* Right Side - Title */}
						<div className={cn("flex-1", logoPosition === "RIGHT" && "order-1")}>
							<div
								className="text-lg font-bold"
								style={{ color: brandColor }}
							>
								DEVIS
							</div>
							<div className="mt-1 text-xs text-muted-foreground">
								{activeOrganization.name}
							</div>
						</div>
					</div>

					{/* Content placeholder */}
					<div className="mt-4 space-y-2">
						<div className="h-2 w-3/4 rounded bg-muted" />
						<div className="h-2 w-1/2 rounded bg-muted" />
						<div className="h-2 w-2/3 rounded bg-muted" />
					</div>
				</div>
			</SettingsItem>
		</div>
	);
}
