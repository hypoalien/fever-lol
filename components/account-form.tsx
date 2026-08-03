"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import axios from "axios";
import { useDebouncedCallback } from "use-debounce";
import { Check, ExternalLink, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { FieldRow, SettingsSection } from "@/components/settings/section";
import { SaveBar } from "@/components/settings/save-bar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FadeIn } from "@/components/ui/motion";
import { FormSkeleton } from "@/components/ui/skeletons";
import { errorMessage } from "@/lib/errors";
import { SUPPORTED_CURRENCIES } from "@/lib/money";

const schema = z.object({
  firstName: z.string().trim().max(100).optional().or(z.literal("")),
  lastName: z.string().trim().max(100).optional().or(z.literal("")),
  orgName: z.string().trim().max(200).optional().or(z.literal("")),
  orgUrl: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]*$/, "Lowercase letters, numbers and hyphens only")
    .optional()
    .or(z.literal("")),
  currency: z.string().optional().or(z.literal("")),
});

type Values = z.infer<typeof schema>;

const CURRENCY_NAMES: Record<string, string> = {
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "Pound Sterling",
  INR: "Indian Rupee",
  CAD: "Canadian Dollar",
  AUD: "Australian Dollar",
  BRL: "Brazilian Real",
  SGD: "Singapore Dollar",
  JPY: "Japanese Yen",
  KRW: "South Korean Won",
};

/**
 * Profile settings.
 *
 * Grouped into sections that each say what they are for, rather than one long
 * undifferentiated card where the organization slug sat next to the currency
 * lock with nothing to distinguish their consequences.
 */
export function AccountForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [urlState, setUrlState] = useState<
    "idle" | "checking" | "free" | "taken"
  >("idle");
  const [currencyLocked, setCurrencyLocked] = useState(false);
  const [origin, setOrigin] = useState("");

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      orgName: "",
      orgUrl: "",
      currency: "",
    },
    mode: "onBlur",
  });

  useEffect(() => setOrigin(window.location.origin), []);

  useEffect(() => {
    let cancelled = false;

    axios
      .get("/api/profile")
      .then(({ data }) => {
        if (cancelled) return;
        form.reset({
          firstName: data.firstName ?? "",
          lastName: data.lastName ?? "",
          orgName: data.orgName ?? "",
          orgUrl: data.orgUrl ?? "",
          currency: data.currency ?? "",
        });
        // Currency decides how existing events are priced, so it is fixed once
        // chosen — the server refuses to change it either way.
        setCurrencyLocked(Boolean(data.currency));
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(errorMessage(error, "Could not load your profile"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [form]);

  const checkUrl = useDebouncedCallback(async (value: string) => {
    if (!value || value === form.formState.defaultValues?.orgUrl) {
      setUrlState("idle");
      return;
    }
    setUrlState("checking");
    try {
      const { data } = await axios.get(
        `/api/check-url?orgUrl=${encodeURIComponent(value)}`
      );
      setUrlState(data.available ? "free" : "taken");
    } catch {
      setUrlState("idle");
    }
  }, 400);

  const onSubmit = async (values: Values) => {
    if (urlState === "taken") {
      toast.error("That address is already taken");
      return;
    }

    setSaving(true);
    try {
      // An empty string means "not set", not "set to nothing".
      const payload = Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== "")
      );
      await axios.post("/api/profile", payload);
      form.reset(values);
      setUrlState("idle");
      toast.success("Profile saved");
    } catch (error) {
      toast.error(errorMessage(error, "Could not save your profile"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-5">
        <FormSkeleton />
      </div>
    );
  }

  const orgUrl = form.watch("orgUrl");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FadeIn className="space-y-6">
          <SettingsSection
            title="About you"
            description="Appears on receipts and in the emails buyers receive."
          >
            <FieldRow>
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First name</FormLabel>
                    <FormControl>
                      <Input placeholder="Sam" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last name</FormLabel>
                    <FormControl>
                      <Input placeholder="Rivera" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FieldRow>
          </SettingsSection>

          <SettingsSection
            title="Your organization"
            description="What buyers see when they land on one of your events."
          >
            <FormField
              control={form.control}
              name="orgName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization name</FormLabel>
                  <FormControl>
                    <Input placeholder="Lantern Collective" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="orgUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Public page address</FormLabel>
                  <FormControl>
                    {/* The prefix is shown rather than explained, so there is
                        no guessing about what the field contains. */}
                    <div className="flex items-center rounded-md border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
                      <span className="shrink-0 border-r bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                        {origin.replace(/^https?:\/\//, "")}/org/
                      </span>
                      <input
                        {...field}
                        placeholder="lantern"
                        onChange={(event) => {
                          const value = event.target.value.toLowerCase();
                          field.onChange(value);
                          void checkUrl(value);
                        }}
                        className="w-full bg-transparent px-3 py-2 text-sm outline-none"
                      />
                      <span className="shrink-0 px-3">
                        {urlState === "checking" && (
                          <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        )}
                        {urlState === "free" && (
                          <Check className="size-4 text-success" />
                        )}
                        {urlState === "taken" && (
                          <X className="size-4 text-destructive" />
                        )}
                      </span>
                    </div>
                  </FormControl>
                  {urlState === "taken" ? (
                    <p className="text-sm text-destructive">
                      Already taken — try something else
                    </p>
                  ) : (
                    <FormDescription>
                      {orgUrl ? (
                        <a
                          href={`/org/${orgUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          Visit your page
                          <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        "Where all your events are listed together."
                      )}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </SettingsSection>

          <SettingsSection
            title="Currency"
            description="What your tickets are priced in."
            footer={
              currencyLocked
                ? "Locked. Changing it would reinterpret the price of every event you have already created."
                : "Choose carefully — this cannot be changed once saved."
            }
          >
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={currencyLocked}
                  >
                    <FormControl>
                      <SelectTrigger className="sm:max-w-xs">
                        <SelectValue placeholder="Choose a currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SUPPORTED_CURRENCIES.map((code) => (
                        <SelectItem key={code} value={code}>
                          {code} — {CURRENCY_NAMES[code] ?? code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </SettingsSection>
        </FadeIn>

        <SaveBar
          visible={form.formState.isDirty}
          saving={saving}
          onSave={form.handleSubmit(onSubmit)}
          onReset={() => {
            form.reset();
            setUrlState("idle");
          }}
        />
      </form>
    </Form>
  );
}
