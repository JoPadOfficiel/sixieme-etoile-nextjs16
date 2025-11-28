"use client";

import { useState } from "react";
import { Button } from "@ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@ui/components/dialog";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui/components/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/components/tabs";
import { Loader2Icon, PercentIcon, PlusIcon, TagIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOptionalFees } from "../hooks/useOptionalFees";
import { usePromotions } from "../hooks/usePromotions";

export interface AddedFee {
  id: string;
  type: "fee" | "promotion";
  name: string;
  description?: string;
  amount: number;
  vatRate: number;
  discountType?: "FIXED" | "PERCENTAGE";
  promoCode?: string;
}

interface AddQuoteFeeDialogProps {
  onAdd: (fee: AddedFee) => void;
  disabled?: boolean;
  existingFeeIds?: string[];
  existingPromotionIds?: string[];
}

/**
 * Dialog to add optional fees or promotions to a quote
 * Similar to AddInvoiceFeeDialog but for quotes
 */
export function AddQuoteFeeDialog({
  onAdd,
  disabled,
  existingFeeIds = [],
  existingPromotionIds = [],
}: AddQuoteFeeDialogProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"fees" | "promotions">("fees");
  const [mode, setMode] = useState<"catalog" | "custom">("catalog");
  const [promoMode, setPromoMode] = useState<"catalog" | "custom">("catalog");
  const [selectedFeeId, setSelectedFeeId] = useState<string>("");
  const [selectedPromotionId, setSelectedPromotionId] = useState<string>("");
  const [customDescription, setCustomDescription] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [customVatRate, setCustomVatRate] = useState("20");
  // Custom promotion fields
  const [customPromoCode, setCustomPromoCode] = useState("");
  const [customPromoAmount, setCustomPromoAmount] = useState("");
  const [customPromoDescription, setCustomPromoDescription] = useState("");

  const { fees, isLoading: feesLoading } = useOptionalFees();
  const { promotions, isLoading: promotionsLoading } = usePromotions();

  // Filter out already selected fees/promotions
  const availableFees = fees.filter((f) => !existingFeeIds.includes(f.id));
  const availablePromotions = promotions.filter((p) => !existingPromotionIds.includes(p.id));

  const selectedFee = fees.find((f) => f.id === selectedFeeId);
  const selectedPromotion = promotions.find((p) => p.id === selectedPromotionId);

  const handleSubmit = () => {
    if (tab === "fees") {
      if (mode === "catalog" && selectedFee) {
        onAdd({
          id: selectedFee.id,
          type: "fee",
          name: selectedFee.name,
          description: selectedFee.description ?? undefined,
          amount: selectedFee.amount,
          vatRate: selectedFee.vatRate ?? 20,
        });
      } else if (mode === "custom" && customDescription && customAmount) {
        onAdd({
          id: `custom-${crypto.randomUUID()}`,
          type: "fee",
          name: customDescription,
          amount: parseFloat(customAmount),
          vatRate: parseFloat(customVatRate),
        });
      }
    } else if (tab === "promotions") {
      if (promoMode === "catalog" && selectedPromotion) {
        onAdd({
          id: selectedPromotion.id,
          type: "promotion",
          name: `${t("quotes.create.promotionPrefix")} ${selectedPromotion.code}`,
          description: selectedPromotion.description ?? undefined,
          amount: selectedPromotion.discountType === "FIXED" 
            ? -selectedPromotion.value 
            : -selectedPromotion.value, // Negative for discounts
          vatRate: 20,
          discountType: selectedPromotion.discountType,
          promoCode: selectedPromotion.code,
        });
      } else if (promoMode === "custom" && customPromoCode && customPromoAmount) {
        onAdd({
          id: `custom-promo-${crypto.randomUUID()}`,
          type: "promotion",
          name: `${t("quotes.create.promotionPrefix")} ${customPromoCode}`,
          description: customPromoDescription || undefined,
          amount: -Math.abs(parseFloat(customPromoAmount)), // Always negative
          vatRate: 20,
          discountType: "FIXED",
          promoCode: customPromoCode,
        });
      }
    }

    // Reset and close
    resetForm();
    setOpen(false);
  };

  const resetForm = () => {
    setSelectedFeeId("");
    setSelectedPromotionId("");
    setCustomDescription("");
    setCustomAmount("");
    setCustomVatRate("20");
    setMode("catalog");
    setPromoMode("catalog");
    setCustomPromoCode("");
    setCustomPromoAmount("");
    setCustomPromoDescription("");
  };

  const canSubmit =
    (tab === "fees" && mode === "catalog" && selectedFeeId) ||
    (tab === "fees" && mode === "custom" && customDescription && customAmount && parseFloat(customAmount) !== 0) ||
    (tab === "promotions" && promoMode === "catalog" && selectedPromotionId) ||
    (tab === "promotions" && promoMode === "custom" && customPromoCode && customPromoAmount && parseFloat(customPromoAmount) !== 0);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <PlusIcon className="size-4 mr-2" />
          {t("quotes.create.addFeeOrPromo")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TagIcon className="size-5" />
            {t("quotes.create.addFeeTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("quotes.create.addFeeDescription")}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "fees" | "promotions")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fees" className="flex items-center gap-2">
              <TagIcon className="size-4" />
              {t("quotes.create.feesTab")}
            </TabsTrigger>
            <TabsTrigger value="promotions" className="flex items-center gap-2">
              <PercentIcon className="size-4" />
              {t("quotes.create.promotionsTab")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fees" className="space-y-4 pt-4">
            {/* Mode selector */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === "catalog" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("catalog")}
                className="flex-1"
              >
                {t("quotes.create.fromCatalog")}
              </Button>
              <Button
                type="button"
                variant={mode === "custom" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("custom")}
                className="flex-1"
              >
                {t("quotes.create.customFee")}
              </Button>
            </div>

            {mode === "catalog" ? (
              <div className="space-y-2">
                <Label>{t("quotes.create.selectFee")}</Label>
                {feesLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
                  </div>
                ) : availableFees.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    {t("quotes.create.noFeesAvailable")}
                  </p>
                ) : (
                  <Select value={selectedFeeId} onValueChange={setSelectedFeeId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("quotes.create.selectFeePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFees.map((fee) => (
                        <SelectItem key={fee.id} value={fee.id}>
                          <div className="flex items-center justify-between w-full gap-4">
                            <span>{fee.name}</span>
                            <span className="text-muted-foreground">
                              {fee.amount.toLocaleString("fr-FR", {
                                style: "currency",
                                currency: "EUR",
                              })}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {selectedFee && (
                  <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("quotes.create.amount")}</span>
                      <span className="font-medium">
                        {selectedFee.amount.toLocaleString("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("quotes.create.vatRate")}</span>
                      <span>{selectedFee.vatRate ?? 20}%</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">{t("quotes.create.feeDescription")}</Label>
                  <Input
                    id="description"
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    placeholder={t("quotes.create.feeDescriptionPlaceholder")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">{t("quotes.create.amountHT")}</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vatRate">{t("quotes.create.vatRate")}</Label>
                    <Select value={customVatRate} onValueChange={setCustomVatRate}>
                      <SelectTrigger id="vatRate">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0%</SelectItem>
                        <SelectItem value="5.5">5.5%</SelectItem>
                        <SelectItem value="10">10%</SelectItem>
                        <SelectItem value="20">20%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="promotions" className="space-y-4 pt-4">
            {/* Mode selector for promotions */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={promoMode === "catalog" ? "default" : "outline"}
                size="sm"
                onClick={() => setPromoMode("catalog")}
                className="flex-1"
              >
                {t("quotes.create.fromCatalog")}
              </Button>
              <Button
                type="button"
                variant={promoMode === "custom" ? "default" : "outline"}
                size="sm"
                onClick={() => setPromoMode("custom")}
                className="flex-1"
              >
                {t("quotes.create.customPromo")}
              </Button>
            </div>

            {promoMode === "catalog" ? (
              <div className="space-y-2">
                <Label>{t("quotes.create.selectPromotion")}</Label>
                {promotionsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
                  </div>
                ) : availablePromotions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    {t("quotes.create.noPromotionsAvailable")}
                  </p>
                ) : (
                  <Select value={selectedPromotionId} onValueChange={setSelectedPromotionId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("quotes.create.selectPromotionPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePromotions.map((promo) => (
                        <SelectItem key={promo.id} value={promo.id}>
                          <div className="flex items-center justify-between w-full gap-4">
                            <span className="font-mono">{promo.code}</span>
                            <span className="text-green-600">
                              -{promo.discountType === "FIXED" 
                                ? promo.value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })
                                : `${promo.value}%`
                              }
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {selectedPromotion && (
                  <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("quotes.create.promoCode")}</span>
                      <span className="font-mono font-medium">{selectedPromotion.code}</span>
                    </div>
                    {selectedPromotion.description && (
                      <p className="text-muted-foreground text-xs">{selectedPromotion.description}</p>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("quotes.create.discount")}</span>
                      <span className="font-medium text-green-600">
                        -{selectedPromotion.discountType === "FIXED" 
                          ? selectedPromotion.value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })
                          : `${selectedPromotion.value}%`
                        }
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="promoCode">{t("quotes.create.promoCode")}</Label>
                  <Input
                    id="promoCode"
                    value={customPromoCode}
                    onChange={(e) => setCustomPromoCode(e.target.value.toUpperCase())}
                    placeholder={t("quotes.create.promoCodePlaceholder")}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="promoAmount">{t("quotes.create.discountAmount")}</Label>
                  <Input
                    id="promoAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={customPromoAmount}
                    onChange={(e) => setCustomPromoAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="promoDescription">{t("quotes.create.feeDescription")} ({t("common.optional")})</Label>
                  <Input
                    id="promoDescription"
                    value={customPromoDescription}
                    onChange={(e) => setCustomPromoDescription(e.target.value)}
                    placeholder={t("quotes.create.promoDescriptionPlaceholder")}
                  />
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {t("quotes.create.addLine")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddQuoteFeeDialog;
