"use client";

import { format, parseISO } from "date-fns";
import { CalendarIcon, Plus, X, Clock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useState, useEffect } from "react";
import type { EventFormSectionProps } from "@/types/event-form";

interface TimeSlot {
  date: Date;
  startTime: string;
  endTime: string;
}

export function EventTimeSlotsManager({ form }: EventFormSectionProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [date, setDate] = useState<Date>();
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");

  useEffect(() => {
    const currentTimings = form.getValues("timings") || [];
    setTimeSlots(currentTimings);
  }, [form]);

  const disableDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const removeTimeSlot = (index: number) => {
    const updatedSlots = timeSlots.filter((_, i) => i !== index);
    setTimeSlots(updatedSlots);
    form.setValue("timings", updatedSlots);
  };

  const addTimeSlot = (e: React.MouseEvent) => {
    e.preventDefault();
    if (date && startTime && endTime) {
      const newSlot: TimeSlot = {
        date,
        startTime,
        endTime,
      };
      // Use the callback form of setState
      setTimeSlots((prevTimeSlots) => [...prevTimeSlots, newSlot]);
      // Update the form value as well
      form.setValue("timings", [...timeSlots, newSlot]);
      console.log("timings---", form.getValues());
      setDate(undefined);
      setStartTime("");
      setEndTime("");
      // Close the drawer after adding a time slot
      setIsDrawerOpen(false);
    }
  };

  const groupTimeSlots = (slots: TimeSlot[]) => {
    if (!slots) return {};
    return slots.reduce((groups: { [key: string]: TimeSlot[] }, slot) => {
      const dateKey = format(new Date(slot.date.toDateString()), "yyyy-MM-dd");
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(slot);
      return groups;
    }, {});
  };

  return (
    <FormField
      control={form.control}
      name="timings"
      render={({}) => (
        <FormItem>
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Event Time Slots
              </CardTitle>
              <CardDescription>
                Manage the schedule for your live event
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Button
                  onClick={() => setIsDrawerOpen(true)}
                  className="w-full"
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Time Slot
                </Button>

                <div className="space-y-6">
                  {Object.entries(groupTimeSlots(timeSlots)).map(
                    ([dateKey, slots]) => (
                      <div key={dateKey} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-semibold">
                            {format(parseISO(dateKey), "EEEE, MMMM d, yyyy")}
                          </h3>
                        </div>
                        <div className="grid gap-2">
                          {slots.map((slot, index) => (
                            <div
                              key={index}
                              className="group relative overflow-hidden rounded-lg border bg-card p-4 transition-all hover:shadow-md"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        variant="secondary"
                                        className="font-medium"
                                      >
                                        {slot.startTime}
                                      </Badge>
                                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                      <Badge
                                        variant="secondary"
                                        className="font-medium"
                                      >
                                        {slot.endTime}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      Duration:{" "}
                                      {calculateDuration(
                                        slot.startTime,
                                        slot.endTime
                                      )}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeTimeSlot(index)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <Separator className="mt-4" />
                      </div>
                    )
                  )}
                  {(!timeSlots || timeSlots.length === 0) && (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                      <Clock className="h-12 w-12 mb-4 text-muted-foreground/50" />
                      <h3 className="font-medium mb-1">No time slots added</h3>
                      <p className="text-sm text-muted-foreground">
                        Add your first time slot to start scheduling your event
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <DrawerContent>
              <div className="mx-auto w-full max-w-sm">
                <DrawerHeader>
                  <DrawerTitle>Add New Time Slot</DrawerTitle>
                  <DrawerDescription>
                    Set the date and time for your event.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="p-4 pb-0">
                  <div className="space-y-4">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? (
                            format(date, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          disabled={disableDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <div className="flex space-x-2">
                      <div className="flex-1">
                        <Select value={startTime} onValueChange={setStartTime}>
                          <SelectTrigger>
                            <SelectValue placeholder="Start Time" />
                          </SelectTrigger>
                          <SelectContent>{generateTimeOptions()}</SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <Select value={endTime} onValueChange={setEndTime}>
                          <SelectTrigger>
                            <SelectValue placeholder="End Time" />
                          </SelectTrigger>
                          <SelectContent>{generateTimeOptions()}</SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
                <DrawerFooter>
                  <Button
                    type="button"
                    onClick={addTimeSlot}
                    disabled={!date || !startTime || !endTime}
                  >
                    Add Time Slot
                  </Button>
                  <DrawerClose asChild>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </div>
            </DrawerContent>
          </Drawer>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function calculateDuration(startTime: string, endTime: string): string {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  let hours = endHour - startHour;
  let minutes = endMinute - startMinute;

  if (minutes < 0) {
    hours -= 1;
    minutes += 60;
  }

  if (hours === 0) {
    return `${minutes} minutes`;
  } else if (minutes === 0) {
    return `${hours} hour${hours > 1 ? "s" : ""}`;
  } else {
    return `${hours} hour${hours > 1 ? "s" : ""} ${minutes} minutes`;
  }
}

function generateTimeOptions() {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`;
      options.push(
        <SelectItem key={time} value={time}>
          {time}
        </SelectItem>
      );
    }
  }
  return options;
}
