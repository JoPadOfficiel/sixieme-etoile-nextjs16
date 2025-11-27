"use client";

import { Button } from "@ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Textarea } from "@ui/components/textarea";
import {
  CalendarIcon,
  CheckCircleIcon,
  EditIcon,
  EyeIcon,
  FileTextIcon,
  Loader2Icon,
  SaveIcon,
  SendIcon,
  XCircleIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@ui/lib";
import type { Quote } from "../types";

interface QuoteActivityLogProps {
  quote: Quote;
  onUpdateNotes: (notes: string | null) => Promise<void>;
  isUpdating: boolean;
  className?: string;
}

interface ActivityEvent {
  type: "created" | "sent" | "viewed" | "accepted" | "rejected" | "expired";
  date: Date;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
}

/**
 * QuoteActivityLog Component
 * 
 * Right column of the Quote Detail page.
 * Displays activity timeline and notes section.
 * 
 * @see Story 6.3: Quote Detail with Stored tripAnalysis
 */
export function QuoteActivityLog({
  quote,
  onUpdateNotes,
  isUpdating,
  className,
}: QuoteActivityLogProps) {
  const t = useTranslations();
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(quote.notes || "");

  const isDraft = quote.status === "DRAFT";

  // Build activity events from quote data
  const events: ActivityEvent[] = [];

  // Created event (always present)
  events.push({
    type: "created",
    date: new Date(quote.createdAt),
    icon: FileTextIcon,
    colorClass: "text-blue-500",
  });

  // Sent event
  if (quote.sentAt) {
    events.push({
      type: "sent",
      date: new Date(quote.sentAt),
      icon: SendIcon,
      colorClass: "text-purple-500",
    });
  }

  // Viewed event
  if (quote.viewedAt) {
    events.push({
      type: "viewed",
      date: new Date(quote.viewedAt),
      icon: EyeIcon,
      colorClass: "text-cyan-500",
    });
  }

  // Accepted event
  if (quote.acceptedAt) {
    events.push({
      type: "accepted",
      date: new Date(quote.acceptedAt),
      icon: CheckCircleIcon,
      colorClass: "text-green-500",
    });
  }

  // Rejected event
  if (quote.rejectedAt) {
    events.push({
      type: "rejected",
      date: new Date(quote.rejectedAt),
      icon: XCircleIcon,
      colorClass: "text-red-500",
    });
  }

  // Sort by date descending (most recent first)
  events.sort((a, b) => b.date.getTime() - a.date.getTime());

  const formatEventDate = (date: Date) => {
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSaveNotes = async () => {
    await onUpdateNotes(notesValue || null);
    setIsEditingNotes(false);
  };

  const handleCancelEdit = () => {
    setNotesValue(quote.notes || "");
    setIsEditingNotes(false);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Activity Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {t("quotes.detail.activity.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {events.map((event, index) => {
              const Icon = event.icon;
              return (
                <div key={index} className="flex items-start gap-3">
                  <div className={cn("mt-0.5", event.colorClass)}>
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">
                      {t(`quotes.detail.activity.events.${event.type}`)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatEventDate(event.date)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Validity */}
      {quote.validUntil && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {t("quotes.detail.validity.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              <CalendarIcon className="size-4 text-muted-foreground" />
              <span>
                {t("quotes.detail.validity.validUntil")}:{" "}
                {new Date(quote.validUntil).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {t("quotes.detail.notes.title")}
            </CardTitle>
            {isDraft && !isEditingNotes && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingNotes(true)}
              >
                <EditIcon className="size-4 mr-1" />
                {t("quotes.detail.notes.edit")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditingNotes ? (
            <div className="space-y-3">
              <Textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                placeholder={t("quotes.detail.notes.placeholder")}
                rows={4}
                disabled={isUpdating}
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveNotes}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <Loader2Icon className="size-4 mr-1 animate-spin" />
                  ) : (
                    <SaveIcon className="size-4 mr-1" />
                  )}
                  {t("quotes.detail.notes.save")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isUpdating}
                >
                  {t("quotes.detail.notes.cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm">
              {quote.notes ? (
                <p className="whitespace-pre-wrap">{quote.notes}</p>
              ) : (
                <p className="text-muted-foreground italic">
                  {t("quotes.detail.notes.empty")}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default QuoteActivityLog;
