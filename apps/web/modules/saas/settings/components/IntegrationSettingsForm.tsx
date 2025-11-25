"use client";

import { Alert, AlertDescription } from "@ui/components/alert";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { apiClient } from "@shared/lib/api-client";
import { SettingsItem } from "@saas/shared/components/SettingsItem";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2Icon, KeyIcon, Loader2Icon, TrashIcon, XCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useToast } from "@ui/hooks/use-toast";

interface IntegrationSettings {
  googleMapsApiKey: string | null;
  collectApiKey: string | null;
  hasGoogleMapsKey: boolean;
  hasCollectApiKey: boolean;
}

export function IntegrationSettingsForm() {
  const t = useTranslations();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [googleMapsKey, setGoogleMapsKey] = useState("");
  const [collectApiKey, setCollectApiKey] = useState("");

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["integrationSettings"],
    queryFn: async () => {
      const response = await apiClient.vtc.settings.integrations.$get();
      if (!response.ok) {
        throw new Error("Failed to fetch integration settings");
      }
      return response.json() as Promise<IntegrationSettings>;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { googleMapsApiKey?: string | null; collectApiKey?: string | null }) => {
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
      toast({ title: t("organizations.settings.integrations.notifications.deleted") });
    },
    onError: () => {
      toast({ title: t("organizations.settings.integrations.notifications.deleteFailed"), variant: "error" });
    },
  });

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
      <SettingsItem
        title={t("organizations.settings.integrations.googleMaps.title")}
        description={t("organizations.settings.integrations.googleMaps.description")}
      >
        <div className="space-y-3">
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
        </div>
      </SettingsItem>

      <SettingsItem
        title={t("organizations.settings.integrations.collectApi.title")}
        description={t("organizations.settings.integrations.collectApi.description")}
      >
        <div className="space-y-3">
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
        </div>
      </SettingsItem>
    </div>
  );
}
