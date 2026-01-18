"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@shared/lib/api-client";
import { useToast } from "@ui/hooks/use-toast";
import { useTranslations } from "next-intl";

interface UseMissionActionsOptions {
  onUnassignSuccess?: () => void;
  onCancelSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useMissionActions(options?: UseMissionActionsOptions) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const t = useTranslations("dispatch.actions");

  const unassignMutation = useMutation({
    mutationFn: async (missionId: string) => {
      const response = await apiClient.vtc.missions[":id"].unassign.$post({
        param: { id: missionId },
      });

      if (!response.ok) {
        throw new Error("Failed to unassign mission");
      }

      return response.json();
    },
    onSuccess: (_, missionId) => {
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      queryClient.invalidateQueries({ queryKey: ["mission", missionId] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      
      toast({
        title: t("unassignSuccess"),
      });

      options?.onUnassignSuccess?.();
    },
    onError: (error) => {
      toast({
        title: t("unassignError"),
        description: error.message,
        variant: "error",
      });
      options?.onError?.(error);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (missionId: string) => {
      const response = await apiClient.vtc.missions[":id"].cancel.$post({
        param: { id: missionId },
      });

      if (!response.ok) {
        throw new Error("Failed to cancel mission");
      }

      return response.json();
    },
    onSuccess: (_, missionId) => {
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      queryClient.invalidateQueries({ queryKey: ["mission", missionId] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      
      toast({
        title: t("cancelSuccess"),
      });

      options?.onCancelSuccess?.();
    },
    onError: (error) => {
      toast({
        title: t("cancelError"),
        description: error.message,
        variant: "error",
      });
      options?.onError?.(error);
    },
  });

  return {
    unassign: unassignMutation.mutate,
    unassignAsync: unassignMutation.mutateAsync,
    isUnassigning: unassignMutation.isPending,
    cancel: cancelMutation.mutate,
    cancelAsync: cancelMutation.mutateAsync,
    isCancelling: cancelMutation.isPending,
  };
}
