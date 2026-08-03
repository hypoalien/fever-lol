"use client";
import { useState, FormEvent, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { signOut, useSession } from "@/lib/auth-client";
import { useDebouncedCallback } from "use-debounce";
import { CheckCircleIcon, XCircleIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  orgName: string;
  orgUrl: string;
  currency: string;
}

export function OnboardingForm() {
  const { data: session } = useSession();
  const user = session?.user;
  const router = useRouter();
  const [urlAvailable, setUrlAvailable] = useState<boolean | null>(null);
  const [checkingUrl, setCheckingUrl] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<UserData>({
    firstName: "",
    lastName: "",
    email: "",
    orgName: "",
    orgUrl: "",
    currency: "",
  });
  const [domain, setDomain] = useState<string>("");

  useEffect(() => {
    const currentDomain = window.location.origin;
    setDomain(currentDomain);
  }, []);
  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        const [firstName = "", lastName = ""] = (user.name || "").split(" ");

        try {
          const response = await axios.get("/api/onboarding");
          const userData = response.data;

          setFormData({
            firstName: firstName,
            lastName: lastName,
            email: user.email || "",
            orgName: userData.orgName || "",
            orgUrl: userData.orgUrl || "",
            currency: userData.currency || "",
          });
        } catch (error) {
          // If API fails, still set the session data
          setFormData((prev) => ({
            ...prev,
            firstName,
            lastName,
            email: user.email || "",
          }));
          console.error("Error fetching user data:", error);
        }
      }
    };

    fetchUserData();
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "orgUrl") {
      checkUrlAvailability(value);
    }
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      currency: value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await axios.post("/api/onboarding", formData);
      toast.success("Profile completed successfully!");
      router.push("/dashboard");
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkUrlAvailability = useDebouncedCallback(async (url: string) => {
    if (!url) {
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16">
          <div className="flex items-center justify-between h-full">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image
                src="/logo.svg"
                alt="Fever.lol"
                width={32}
                height={32}
                className="h-8 w-auto bg-primary p-1 rounded-sm" // Added primary color for logo
              />
              <span className="text-xl font-semibold text-foreground">
                Fever.lol
              </span>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 w-8 rounded-full hover:bg-muted"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={user?.image ?? ""}
                      alt={user?.name ?? "Profile picture"}
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.name ? user.name.charAt(0).toUpperCase() : "?"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium text-foreground leading-none">
                      {user?.name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-foreground hover:bg-muted">
                  Support
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    void signOut().then(() => router.push("/login"));
                  }}
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <form onSubmit={handleSubmit}>
          <Card className="mx-auto max-w-lg bg-card">
            <CardHeader>
              <CardTitle className="text-xl text-card-foreground">
                Welcome to Fever.lol!
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Please complete your profile to get started
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="firstName" className="text-foreground">
                      First name
                    </Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      placeholder="Max"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="bg-input text-foreground"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lastName" className="text-foreground">
                      Last name
                    </Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      placeholder="Robinson"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className="bg-input text-foreground"
                    />
                  </div>
                </div>
                {/* Other form fields follow the same pattern */}
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="m@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    name="orgName"
                    placeholder="Fever.lol Inc."
                    value={formData.orgName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                {/* <div className="grid gap-2">
                  <Label htmlFor="orgName">Select Currency</Label>

                  <Select
                    onValueChange={handleSelectChange}
                    value={formData.currency || ""}
                    defaultValue={formData.currency}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                    </SelectContent>
                  </Select>
                </div> */}
                <div className="grid gap-2">
                  <Label htmlFor="orgName">Select Currency</Label>
                  <Select
                    onValueChange={handleSelectChange}
                    value={formData.currency || ""}
                    defaultValue={formData.currency}
                    disabled={!!formData.currency} // Disable if currency exists
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                    </SelectContent>
                  </Select>
                  {/* Add warning message */}
                  <p className="text-sm text-amber-500">
                    {formData.currency
                      ? "Currency cannot be changed once saved"
                      : "Please choose carefully. Currency cannot be changed after saving"}
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="orgUrl">Organization URL</Label>
                  <div className="relative">
                    <Input
                      id="orgUrl"
                      name="orgUrl"
                      placeholder="event-url"
                      value={formData.orgUrl}
                      onChange={handleInputChange}
                      required
                      className={`${
                        urlAvailable === true
                          ? "border-green-500"
                          : urlAvailable === false
                          ? "border-destructive"
                          : ""
                      }`}
                    />
                    {checkingUrl && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin h-4 w-4 border-2 border-gray-500 rounded-full border-t-transparent" />
                      </div>
                    )}
                  </div>
                  <div className="text-sm space-y-1.5">
                    {/* URL Availability Status */}
                    {urlAvailable === false && (
                      <p className="flex items-center text-destructive">
                        <XCircleIcon className="h-4 w-4 mr-1.5" />
                        This URL is already taken
                      </p>
                    )}
                    {urlAvailable === true && (
                      <p className="flex items-center text-success">
                        <CheckCircleIcon className="h-4 w-4 mr-1.5" />
                        URL is available
                      </p>
                    )}

                    {/* URL Preview */}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <code className="px-1.5 py-0.5 bg-muted rounded text-foreground">
                        {domain}/org/{formData.orgUrl}
                      </code>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Button
                    type="submit"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={isLoading || urlAvailable === false}
                  >
                    {isLoading ? "Saving..." : "Complete Profile"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </main>
      <footer className="border-t bg-background mt-auto">
        <div className="mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Logo and Description Section */}
            <div className="space-y-4 max-w-sm">
              <div className="flex items-center gap-2.5">
                <Image
                  src="/logo.svg"
                  alt="Fever.lol"
                  width={24}
                  height={24}
                  className="h-6 w-auto bg-primary p-1 rounded-sm"
                />
                <span className="text-lg font-semibold text-foreground">
                  Fever.lol
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Making event management simple and efficient for everyone.
              </p>
            </div>

            {/* Copyright Section */}
            <div className="text-sm text-muted-foreground border-t md:border-t-0 pt-4 md:pt-0">
              © {new Date().getFullYear()} Fever.lol. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
