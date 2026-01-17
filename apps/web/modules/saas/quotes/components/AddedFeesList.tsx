"use client";

import { Button } from "@ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Badge } from "@ui/components/badge";
import { Input } from "@ui/components/input";
import { PercentIcon, TagIcon, TrashIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { AddedFee } from "./AddQuoteFeeDialog";

interface AddedFeesListProps {
  fees: AddedFee[];
  onRemove: (id: string) => void;
  onUpdate?: (id: string, quantity: number) => void;
  disabled?: boolean;
}

/**
 * Component to display added fees and promotions on a quote
 */
export function AddedFeesList({ fees, onRemove, onUpdate, disabled }: AddedFeesListProps) {
  const t = useTranslations();

  if (fees.length === 0) {
    return null;
  }

  const totalFees = fees
    .filter((f) => f.type === "fee")
    .reduce((sum, f) => sum + f.amount * (f.quantity || 1), 0);

  const totalDiscounts = fees
    .filter((f) => f.type === "promotion")
    .reduce((sum, f) => sum + Math.abs(f.amount) * (f.quantity || 1), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>{t("quotes.create.addedFees")}</span>
          <Badge variant="secondary" className="text-xs">
            {fees.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {fees.map((fee) => (
          <div
            key={fee.id}
            className={`flex items-center justify-between p-2 rounded-lg ${
              fee.type === "promotion"
                ? "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800"
                : "bg-muted"
            }`}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {fee.type === "promotion" ? (
                <PercentIcon className="size-4 text-green-600 shrink-0" />
              ) : (
                <TagIcon className="size-4 text-muted-foreground shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{fee.name}</p>
                <div className="flex items-center gap-2">
                  {fee.promoCode && (
                    <p className="text-xs text-muted-foreground font-mono">
                      {fee.promoCode}
                    </p>
                  )}
                  {onUpdate ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">x</span>
                      <Input
                        type="number"
                        className="w-12 h-5 text-[10px] px-1"
                        defaultValue={fee.quantity}
                        min="1"
                        step="1"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const val = parseFloat(e.target.value);
                          if (val >= 1 && val !== fee.quantity) {
                            onUpdate(fee.id, val);
                          }
                        }}
                        disabled={disabled}
                      />
                    </div>
                  ) : fee.quantity > 1 && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                      x{fee.quantity}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`text-sm font-medium ${
                  fee.type === "promotion" ? "text-green-600" : ""
                }`}
              >
                {fee.type === "promotion" ? "-" : "+"}
                {(Math.abs(fee.amount) * (fee.quantity || 1)).toLocaleString("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                })}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(fee.id)}
                disabled={disabled}
              >
                <TrashIcon className="size-4" />
              </Button>
            </div>
          </div>
        ))}

        {/* Summary */}
        <div className="pt-2 border-t space-y-1">
          {totalFees > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total frais</span>
              <span className="font-medium">
                +{totalFees.toLocaleString("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                })}
              </span>
            </div>
          )}
          {totalDiscounts > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total réductions</span>
              <span className="font-medium text-green-600">
                -{totalDiscounts.toLocaleString("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                })}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm font-medium pt-1">
            <span>Net</span>
            <span className={totalFees - totalDiscounts < 0 ? "text-green-600" : ""}>
              {(totalFees - totalDiscounts).toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR",
                signDisplay: "always",
              })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AddedFeesList;
