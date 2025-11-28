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
import { useToast } from "@ui/hooks/use-toast";
import { Loader2Icon, PercentIcon, PlusIcon, TagIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOptionalFees } from "@saas/quotes/hooks/useOptionalFees";
import { usePromotions } from "@saas/quotes/hooks/usePromotions";
import { useAddInvoiceLine } from "../hooks/useInvoiceLines";

interface AddInvoiceFeeDialogProps {
  invoiceId: string;
  disabled?: boolean;
}

/**
 * Dialog to add optional fees, promotions or custom lines to a DRAFT invoice
 */
export function AddInvoiceFeeDialog({ invoiceId, disabled }: AddInvoiceFeeDialogProps) {
  const t = useTranslations();
  const { toast } = useToast();
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
  const addLineMutation = useAddInvoiceLine(invoiceId);

  const selectedFee = fees.find((f) => f.id === selectedFeeId);
  const selectedPromotion = promotions.find((p) => p.id === selectedPromotionId);

  const handleSubmit = async () => {
    if (tab === "fees") {
      if (mode === "catalog" && selectedFee) {
        await addLineMutation.mutateAsync({
          description: selectedFee.name,
          unitPriceExclVat: selectedFee.amount,
          vatRate: selectedFee.vatRate ?? 20,
          lineType: "OPTIONAL_FEE",
        });
      } else if (mode === "custom" && customDescription && customAmount) {
        await addLineMutation.mutateAsync({
          description: customDescription,
          unitPriceExclVat: parseFloat(customAmount),
          vatRate: parseFloat(customVatRate),
          lineType: "OTHER",
        });
      }
    } else if (tab === "promotions") {
      if (promoMode === "catalog" && selectedPromotion) {
        // Promotions are negative amounts (discounts)
        const discountAmount = selectedPromotion.discountType === "FIXED"
          ? -selectedPromotion.value
          : -selectedPromotion.value; // For percentage, we'd need the base amount - simplified here
        
        await addLineMutation.mutateAsync({
          description: `${t("invoices.edit.promotionPrefix")} ${selectedPromotion.code}`,
          unitPriceExclVat: discountAmount,
          vatRate: 20, // Promotions typically follow the main VAT rate
          lineType: "PROMOTION_ADJUSTMENT",
        });
      } else if (promoMode === "custom" && customPromoCode && customPromoAmount) {
        await addLineMutation.mutateAsync({
          description: `${t("invoices.edit.promotionPrefix")} ${customPromoCode}`,
          unitPriceExclVat: -Math.abs(parseFloat(customPromoAmount)), // Always negative
          vatRate: 20,
          lineType: "PROMOTION_ADJUSTMENT",
        });
      }
    }

    toast({
      title: t("invoices.edit.lineAdded"),
    });

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
          {t("invoices.edit.addFee")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TagIcon className="size-5" />
            {t("invoices.edit.addFeeTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("invoices.edit.addFeeDescription")}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "fees" | "promotions")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fees" className="flex items-center gap-2">
              <TagIcon className="size-4" />
              {t("invoices.edit.feesTab")}
            </TabsTrigger>
            <TabsTrigger value="promotions" className="flex items-center gap-2">
              <PercentIcon className="size-4" />
              {t("invoices.edit.promotionsTab")}
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
                {t("invoices.edit.fromCatalog")}
              </Button>
              <Button
                type="button"
                variant={mode === "custom" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("custom")}
                className="flex-1"
              >
                {t("invoices.edit.customFee")}
              </Button>
            </div>

            {mode === "catalog" ? (
              <div className="space-y-2">
                <Label>{t("invoices.edit.selectFee")}</Label>
                {feesLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
                  </div>
                ) : fees.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    {t("invoices.edit.noFeesAvailable")}
                  </p>
                ) : (
                  <Select value={selectedFeeId} onValueChange={setSelectedFeeId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("invoices.edit.selectFeePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {fees.map((fee) => (
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
                      <span className="text-muted-foreground">{t("invoices.edit.amount")}</span>
                      <span className="font-medium">
                        {selectedFee.amount.toLocaleString("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("invoices.edit.vatRate")}</span>
                      <span>{selectedFee.vatRate ?? 20}%</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">{t("invoices.edit.description")}</Label>
                  <Input
                    id="description"
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    placeholder={t("invoices.edit.descriptionPlaceholder")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">{t("invoices.edit.amountHT")}</Label>
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
                    <Label htmlFor="vatRate">{t("invoices.edit.vatRate")}</Label>
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
                {t("invoices.edit.fromCatalog")}
              </Button>
              <Button
                type="button"
                variant={promoMode === "custom" ? "default" : "outline"}
                size="sm"
                onClick={() => setPromoMode("custom")}
                className="flex-1"
              >
                {t("invoices.edit.customPromo")}
              </Button>
            </div>

            {promoMode === "catalog" ? (
              <div className="space-y-2">
                <Label>{t("invoices.edit.selectPromotion")}</Label>
                {promotionsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
                  </div>
                ) : promotions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    {t("invoices.edit.noPromotionsAvailable")}
                  </p>
                ) : (
                  <Select value={selectedPromotionId} onValueChange={setSelectedPromotionId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("invoices.edit.selectPromotionPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {promotions.map((promo) => (
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
                      <span className="text-muted-foreground">{t("invoices.edit.promoCode")}</span>
                      <span className="font-mono font-medium">{selectedPromotion.code}</span>
                    </div>
                    {selectedPromotion.description && (
                      <p className="text-muted-foreground text-xs">{selectedPromotion.description}</p>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("invoices.edit.discount")}</span>
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
                  <Label htmlFor="invoicePromoCode">{t("invoices.edit.promoCode")}</Label>
                  <Input
                    id="invoicePromoCode"
                    value={customPromoCode}
                    onChange={(e) => setCustomPromoCode(e.target.value.toUpperCase())}
                    placeholder={t("invoices.edit.promoCodePlaceholder")}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoicePromoAmount">{t("invoices.edit.discountAmount")}</Label>
                  <Input
                    id="invoicePromoAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={customPromoAmount}
                    onChange={(e) => setCustomPromoAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoicePromoDescription">{t("invoices.edit.description")} ({t("common.optional")})</Label>
                  <Input
                    id="invoicePromoDescription"
                    value={customPromoDescription}
                    onChange={(e) => setCustomPromoDescription(e.target.value)}
                    placeholder={t("invoices.edit.promoDescriptionPlaceholder")}
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
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || addLineMutation.isPending}
          >
            {addLineMutation.isPending && (
              <Loader2Icon className="size-4 mr-2 animate-spin" />
            )}
            {t("invoices.edit.addLine")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddInvoiceFeeDialog;
