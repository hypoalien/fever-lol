"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { PlusCircle, Trash, Tag } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { usePrice } from "@/hooks/use-price";
import type { EventFormSectionProps } from "@/types/event-form";
interface PromoCode {
  code: string;
  discountType: "flat" | "percent";
  discountValue: number;
  maxDiscount?: number;
  minOrderValue?: number;
}

export function EventPromoCodeForm({ form }: EventFormSectionProps) {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const { currency } = usePrice();

  // Load initial values from form
  useEffect(() => {
    const existingCodes = form.getValues("promoCodes");
    if (existingCodes && existingCodes.length > 0) {
      setPromoCodes(existingCodes);
    } else {
      setPromoCodes([
        {
          code: "",
          discountType: "flat",
          discountValue: 0,
          minOrderValue: 0,
        },
      ]);
    }
  }, [form]);

  const removePromoCode = (index: number) => {
    if (promoCodes.length === 1) return;
    const updatedCodes = promoCodes.filter((_, i) => i !== index);
    setPromoCodes(updatedCodes);
    form.setValue("promoCodes", updatedCodes, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  // const updatePromoCode = (index: number, updatedCode: Partial<PromoCode>) => {
  //   const newCodes = [...promoCodes];
  //   newCodes[index] = { ...newCodes[index], ...updatedCode };
  //   setPromoCodes(newCodes);
  //   form.setValue("promoCodes", newCodes, {
  //     shouldValidate: true,
  //     shouldDirty: true,
  //   });
  // };

  const addPromoCode = () => {
    const newCode: PromoCode = {
      code: "",
      discountType: "flat",
      discountValue: 0,
      minOrderValue: 0,
    };
    setPromoCodes([...promoCodes, newCode]);
    form.setValue("promoCodes", [...promoCodes, newCode], {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  return (
    <FormField
      control={form.control}
      name="promoCodes"
      render={({}) => (
        <FormItem>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Promotional Codes
              </CardTitle>
              <CardDescription>
                Create and manage promotional codes for your event
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {promoCodes.map((promoCode, index) => (
                  <div key={index} className="space-y-4">
                    {index > 0 && <Separator />}
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">
                        Promo Code {index + 1}
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePromoCode(index)}
                        disabled={promoCodes.length === 1}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormItem>
                        <FormLabel>Code</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., SUMMER2024"
                            className="uppercase"
                            value={promoCode.code}
                            onChange={(e) => {
                              const newCodes = [...promoCodes];
                              newCodes[index].code =
                                e.target.value.toUpperCase();
                              setPromoCodes(newCodes);
                              form.setValue("promoCodes", newCodes);
                            }}
                          />
                        </FormControl>
                      </FormItem>

                      <FormItem>
                        <FormLabel>Discount Type</FormLabel>
                        <Select
                          value={promoCode.discountType}
                          onValueChange={(value: "flat" | "percent") => {
                            const newCodes = [...promoCodes];
                            newCodes[index].discountType = value;
                            setPromoCodes(newCodes);
                            form.setValue("promoCodes", newCodes);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="flat">Flat Amount</SelectItem>
                            <SelectItem value="percent">Percentage</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>

                      <FormItem>
                        <FormLabel>
                          {promoCode.discountType === "flat"
                            ? `Discount Amount (${
                                currency == "USD" ? "$" : "₹"
                              })`
                            : "Discount Percentage (%)"}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max={
                              promoCode.discountType === "percent"
                                ? 100
                                : undefined
                            }
                            value={promoCode.discountValue || ""}
                            onChange={(e) => {
                              const newCodes = [...promoCodes];
                              newCodes[index].discountValue = Number(
                                e.target.value
                              );
                              setPromoCodes(newCodes);
                              form.setValue("promoCodes", newCodes);
                            }}
                          />
                        </FormControl>
                      </FormItem>

                      <FormItem>
                        <FormLabel>
                          Minimum Order Value {currency == "USD" ? "$" : "₹"}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            value={promoCode.minOrderValue || ""}
                            onChange={(e) => {
                              const newCodes = [...promoCodes];
                              newCodes[index].minOrderValue = Number(
                                e.target.value
                              );
                              setPromoCodes(newCodes);
                              form.setValue("promoCodes", newCodes);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={addPromoCode}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Another Promo Code
                </Button>
              </div>
            </CardContent>
          </Card>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
