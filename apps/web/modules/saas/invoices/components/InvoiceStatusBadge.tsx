"use client";

import { Badge } from "@ui/components/badge";
import {
  FileEdit,
  Send,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";
import type { InvoiceStatus } from "../types";

export interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  className?: string;
}

/**
 * InvoiceStatusBadge Component
 * 
 * Displays a color-coded badge for invoice lifecycle status.
 * 
 * Status colors:
 * - DRAFT: gray (neutral)
 * - ISSUED: blue (sent to client)
 * - PAID: green (success)
 * - CANCELLED: red (cancelled)
 * 
 * @see FR33-FR36 Invoice lifecycle
 * @see UX Spec 6.1.2 Badges & Status Chips
 */
export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
  const t = useTranslations("invoices.status");

  const config = getStatusConfig(status);

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 font-medium",
        config.badgeClass,
        className
      )}
    >
      <config.Icon className="size-3.5" />
      <span>{t(status.toLowerCase())}</span>
    </Badge>
  );
}

function getStatusConfig(status: InvoiceStatus) {
  switch (status) {
    case "DRAFT":
      return {
        Icon: FileEdit,
        badgeClass: "border-gray-500/50 bg-gray-500/10 text-gray-700 dark:text-gray-400",
      };
    case "ISSUED":
      return {
        Icon: Send,
        badgeClass: "border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400",
      };
    case "PAID":
      return {
        Icon: CheckCircle2,
        badgeClass: "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400",
      };
    case "CANCELLED":
      return {
        Icon: XCircle,
        badgeClass: "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400",
      };
  }
}

export default InvoiceStatusBadge;
