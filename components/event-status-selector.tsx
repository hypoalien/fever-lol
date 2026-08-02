"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { EventFormSectionProps } from "@/types/event-form";

export function EventStatusSelector({ form }: EventFormSectionProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const handleStatusChange = (value: string) => {
    if (value === "active") {
      setShowDialog(true);
      setPendingStatus(value);
    } else {
      form.setValue("status", value);
    }
  };

  const handleConfirmStatus = () => {
    if (pendingStatus) {
      form.setValue("status", pendingStatus);
    }
    setShowDialog(false);
    setPendingStatus(null);
  };

  const handleCancelStatus = () => {
    setShowDialog(false);
    setPendingStatus(null);
  };

  return (
    <>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Event Status</CardTitle>
          <CardDescription>
            Set the visibility status of your event
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <FormControl>
                  <Select
                    value={field.value || ""}
                    onValueChange={handleStatusChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select event status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormDescription>
                  Draft events are only visible to organizers. Active events are
                  public and ticketing is enabled.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate Event</DialogTitle>
            <DialogDescription>
              By activating this event, it will become public and people will be
              able to purchase tickets. Are you sure you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelStatus}>
              Cancel
            </Button>
            <Button onClick={handleConfirmStatus}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
