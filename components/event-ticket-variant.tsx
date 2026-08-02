import { useState } from "react";
import { useFieldArray } from "react-hook-form";
import { Edit2, Plus, Trash2, Ticket } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { usePrice } from "@/hooks/use-price";
import type { EventFormSectionProps } from "@/types/event-form";
interface TicketVariant {
  type: string;
  description: string;
  price: string;
  quantity?: string;
  remaining?: string;
}

type TicketVariantFormProps = EventFormSectionProps;

export function EventTicketVariant({ form }: TicketVariantFormProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "ticketVariants",
  });

  const [newVariant, setNewVariant] = useState<TicketVariant>({
    type: "",
    description: "",
    price: "",
    quantity: "",
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const resetForm = () => {
    setNewVariant({
      type: "",
      description: "",
      price: "",
      quantity: "",
    });
    setIsDrawerOpen(false);
    setEditingIndex(null);
  };
  const { currency } = usePrice();

  const handleAddVariant = () => {
    setEditingIndex(null);
    setIsDrawerOpen(true);
  };

  const handleEditVariant = (index: number) => {
    setEditingIndex(index);
    const existing = form.getValues(`ticketVariants.${index}`);
    if (existing) setNewVariant(existing);
    setIsDrawerOpen(true);
  };

  const handleSaveVariant = () => {
    if (editingIndex !== null) {
      form.setValue(`ticketVariants.${editingIndex}`, newVariant);
    } else {
      append(newVariant);
    }
    resetForm();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="h-5 w-5" />
          Ticket Variants
        </CardTitle>
        <CardDescription>
          Create and manage different ticket types for your event
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="group relative overflow-hidden rounded-lg border bg-card transition-all hover:shadow-md"
            >
              <div className="absolute right-4 top-4 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditVariant(index)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-start gap-4">
                  <Badge variant="secondary" className="px-3 py-1.5 text-lg">
                    {currency == "USD" ? "$" : "₹"}
                    {form.getValues(`ticketVariants.${index}`)?.price}
                  </Badge>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">
                      {form.getValues(`ticketVariants.${index}`)?.type}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {form.getValues(`ticketVariants.${index}`)?.description}
                    </p>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Available Tickets
                  </span>
                  <span className="font-medium">
                    {form.getValues(`ticketVariants.${index}`)?.remaining} of{" "}
                    {form.getValues(`ticketVariants.${index}`)?.quantity}
                  </span>
                </div>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={handleAddVariant}
            className="w-full gap-2"
          >
            <Plus className="h-4 w-4" />
            Add New Ticket Variant
          </Button>
        </div>
      </CardContent>

      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader>
              <DrawerTitle>
                {editingIndex !== null
                  ? "Edit Ticket Variant"
                  : "New Ticket Variant"}
              </DrawerTitle>
              <DrawerDescription>
                Fill in the details for your ticket variant
              </DrawerDescription>
            </DrawerHeader>

            <div className="p-4 pb-0">
              <div className="space-y-4">
                                  <FormItem>
                    <FormLabel>Ticket Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter ticket name"
                        value={newVariant.type}
                        onChange={(e) =>
                          setNewVariant({
                            ...newVariant,
                            type: e.target.value,
                          })
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>

                                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter ticket description"
                        value={newVariant.description}
                        onChange={(e) =>
                          setNewVariant({
                            ...newVariant,
                            description: e.target.value,
                          })
                        }
                        className="resize-none"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>

                <div className="grid grid-cols-2 gap-4">
                                      <FormItem>
                      <FormLabel>
                        Price {currency == "USD" ? "$" : "₹"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={newVariant.price}
                          onChange={(e) =>
                            setNewVariant({
                              ...newVariant,
                              price: e.target.value,
                            })
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>

                                      <FormItem>
                      <FormLabel>Total Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="1"
                          value={newVariant.quantity}
                          onChange={(e) =>
                            setNewVariant({
                              ...newVariant,
                              quantity: e.target.value,
                            })
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                </div>
              </div>
            </div>

            <DrawerFooter>
              <Button onClick={handleSaveVariant}>
                {editingIndex !== null ? "Save Changes" : "Add Ticket"}
              </Button>
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </Card>
  );
}
