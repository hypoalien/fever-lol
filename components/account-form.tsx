"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import axios from "axios";
import { useDebouncedCallback } from "use-debounce";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Separator } from "@radix-ui/react-dropdown-menu";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { errorMessage } from "@/lib/errors";

const accountFormSchema = z.object({
  firstName: z.string().optional().or(z.literal("")),
  lastName: z.string().optional().or(z.literal("")),
  currency: z.enum(["USD", "INR"]).optional().or(z.literal("")),
  email: z
    .string()
    .email("Please enter a valid email address")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .regex(/^\d{10,15}$/, "Phone number must be between 10-15 digits")
    .optional()
    .or(z.literal("")),
  orgName: z.string().optional().or(z.literal("")),
  orgDescription: z.string().optional().or(z.literal("")),
  orgUrl: z
    .string()
    .regex(
      /^[a-zA-Z0-9-]+$/,
      "URL can only contain letters, numbers, and hyphens"
    )
    .optional()
    .or(z.literal("")),
  ctaUrl: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

export function AccountForm() {
  const [urlAvailable, setUrlAvailable] = useState<boolean | null>(null);
  const [checkingUrl, setCheckingUrl] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialOrgUrl, setInitialOrgUrl] = useState<string>("");
  const [domain, setDomain] = useState<string>("");

  useEffect(() => {
    const currentDomain = window.location.origin;
    setDomain(currentDomain);
  }, []);

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      orgName: "",
      orgDescription: "",
      orgUrl: "",
      ctaUrl: "",
      currency: "",
    },
  });

  const checkUrlAvailability = useDebouncedCallback(async (url: string) => {
    if (!url || url === initialOrgUrl) {
      setUrlAvailable(null);
      return;
    }

    setCheckingUrl(true);
    try {
      const response = await axios.get(
        `/api/check-url?orgUrl=${encodeURIComponent(url)}`
      );
      setUrlAvailable(response.data.available);
    } catch (error) {
      console.error("Error checking URL availability:", error);
      setUrlAvailable(null);
    } finally {
      setCheckingUrl(false);
    }
  }, 500);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get("/api/profile");
        if (response.data) {
          form.reset(response.data);
          setInitialOrgUrl(response.data.orgUrl || "");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError("Failed to load user data. Please try again later.");
      }
    };

    fetchUserData();
  }, [form]);

  const onSubmit = async (data: AccountFormValues) => {
    const orgUrlChanged = data.orgUrl !== initialOrgUrl;
    if (orgUrlChanged && !urlAvailable && data.orgUrl) {
      toast.error("Please choose a different organization URL");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await axios.post("/api/profile", data);
      if (response.status === 200) {
        toast.success("Profile updated successfully");
      }
    } catch (error: unknown) {
      const message = errorMessage(error, "Failed to update profile");
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Details</CardTitle>
        <CardDescription>Update your account details below.</CardDescription>
      </CardHeader>
      <Separator />
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-8 max-w-2xl mx-auto"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="First name" {...field} />
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
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (Optional)</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="orgName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Organization name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="orgDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your organization"
                      className="resize-none h-32"
                      {...field}
                    />
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
                  <FormLabel>Organization URL</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        placeholder="event-url"
                        className={`${
                          field.value !== initialOrgUrl && urlAvailable === true
                            ? "border-green-500"
                            : field.value !== initialOrgUrl &&
                              urlAvailable === false
                            ? "border-destructive"
                            : ""
                        }`}
                        onChange={(e) => {
                          field.onChange(e);
                          checkUrlAvailability(e.target.value);
                        }}
                      />
                      {checkingUrl && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="animate-spin h-4 w-4 border-2 border-gray-500 rounded-full border-t-transparent" />
                        </div>
                      )}
                    </div>
                  </FormControl>
                  {field.value !== initialOrgUrl && urlAvailable === false && (
                    <p className="text-sm text-destructive">
                      This URL is already taken
                    </p>
                  )}
                  {field.value !== initialOrgUrl && urlAvailable === true && (
                    <p className="text-sm text-success">URL is available</p>
                  )}
                  <FormDescription>
                    <Button variant={"link"} className="flex">
                      <Link
                        href={`${domain}/org/${field.value}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <code className="px-1.5 py-0.5 bg-muted rounded text-foreground">
                            {domain}/org/{field.value}
                          </code>
                          <ExternalLinkIcon className="h-4 w-4 ml-2" />
                        </div>
                      </Link>
                    </Button>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ctaUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Call to Action URL</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://www.instagram.com/your_account"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter a URL for visitors to follow your organization
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Currency</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                    defaultValue={field.value}
                    disabled={!!field.value} // Disable if currency exists
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose your preferred currency for transactions
                  </FormDescription>
                  {/* Add warning message */}

                  <FormDescription className="text-amber-500">
                    {field.value
                      ? "Currency cannot be changed once saved"
                      : "Please choose carefully. Currency cannot be changed after saving"}
                  </FormDescription>

                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={
                isSubmitting ||
                (form.getValues("orgUrl") !== initialOrgUrl &&
                  urlAvailable === false)
              }
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white rounded-full border-t-transparent" />
                  Saving...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
