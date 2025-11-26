"use client";

import { Badge } from "@ui/components/badge";
import {
  FileEdit,
  Send,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";
import type { QuoteStatus } from "../types";

export interface QuoteStatusBadgeProps {
  status: QuoteStatus;
  className?: string;
}

/**
 * QuoteStatusBadge Component
 * 
 * Displays a color-coded badge for quote lifecycle status.
 * 
 * Status colors:
 * - DRAFT: gray (neutral)
 * - SENT: blue (in progress)
 * - VIEWED: purple (client engaged)
 * - ACCEPTED: green (success)
 * - REJECTED: red (failed)
 * - EXPIRED: orange (warning)
 * 
 * @see FR31 Quote lifecycle states
 * @see UX Spec 6.1.2 Badges & Status Chips
 */
export function QuoteStatusBadge({ status, className }: QuoteStatusBadgeProps) {
  const t = useTranslations("quotes.status");

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

function getStatusConfig(status: QuoteStatus) {
  switch (status) {
    case "DRAFT":
      return {
        Icon: FileEdit,
        badgeClass: "border-gray-500/50 bg-gray-500/10 text-gray-700 dark:text-gray-400",
      };
    case "SENT":
      return {
        Icon: Send,
        badgeClass: "border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400",
      };
    case "VIEWED":
      return {
        Icon: Eye,
        badgeClass: "border-purple-500/50 bg-purple-500/10 text-purple-700 dark:text-purple-400",
      };
    case "ACCEPTED":
      return {
        Icon: CheckCircle2,
        badgeClass: "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400",
      };
    case "REJECTED":
      return {
        Icon: XCircle,
        badgeClass: "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400",
      };
    case "EXPIRED":
      return {
        Icon: Clock,
        badgeClass: "border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-400",
      };
  }
}

export default QuoteStatusBadge;
