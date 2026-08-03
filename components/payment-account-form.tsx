"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Check, Eye, EyeOff, Info } from "lucide-react";
import { toast } from "sonner";

import { SaveBar } from "@/components/settings/save-bar";
import { SettingsSection } from "@/components/settings/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FadeIn } from "@/components/ui/motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSkeleton } from "@/components/ui/skeletons";
import { errorMessage } from "@/lib/errors";

/**
 * Where an organizer's ticket money goes.
 *
 * This screen was broken end to end. It posted a `paymentGateway` field to an
 * endpoint whose schema requires `gateway`, so every save returned 400. It
 * read back `razorpayKeySecret` and `razorpayKeyId`, but the endpoint returns
 * `razorpayKeySecretSet` and a *masked* key id — so nothing loaded, and had
 * the save worked it would have written the mask over the real key. And
 * nothing read the stored keys at checkout regardless.
 *
 * The contract is now matched exactly: masked values are shown as status, not
 * loaded into inputs, and a secret is only sent when the organizer types a new
 * one. Blank means "leave what is stored alone".
 */

type Gateway = "razorpay" | "stripe";

/** Exactly what GET /api/payment-config returns. */
interface MaskedConfig {
  accountHolderName: string | null;
  gateway: Gateway | null;
  razorpayKeyId: string | null;
  razorpayKeySecretSet: boolean;
  stripePublishableKey: string | null;
  stripeSecretKeySet: boolean;
}

const GATEWAYS: Array<{ value: Gateway; label: string; note: string }> = [
  {
    value: "razorpay",
    label: "Razorpay",
    note: "India. Cards, UPI, netbanking and wallets.",
  },
  {
    value: "stripe",
    label: "Stripe",
    note: "Most other countries, including Japan, the EU, the UK and the US.",
  },
];

export function PaymentForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stored, setStored] = useState<MaskedConfig | null>(null);

  const [gateway, setGateway] = useState<Gateway | "">("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    axios
      .get<Partial<MaskedConfig>>("/api/payment-config")
      .then(({ data }) => {
        if (cancelled) return;
        const config: MaskedConfig = {
          accountHolderName: data.accountHolderName ?? null,
          gateway: data.gateway ?? null,
          razorpayKeyId: data.razorpayKeyId ?? null,
          razorpayKeySecretSet: Boolean(data.razorpayKeySecretSet),
          stripePublishableKey: data.stripePublishableKey ?? null,
          stripeSecretKeySet: Boolean(data.stripeSecretKeySet),
        };
        setStored(config);
        setGateway(config.gateway ?? "");
        setAccountHolderName(config.accountHolderName ?? "");
      })
      .catch((requestError) => {
        if (!cancelled) {
          toast.error(
            errorMessage(requestError, "Could not load your payment settings")
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-5">
        <FormSkeleton />
      </div>
    );
  }

  const isRazorpay = gateway === "razorpay";
  const storedKeyId = isRazorpay
    ? stored?.razorpayKeyId
    : stored?.stripePublishableKey;
  const secretStored = isRazorpay
    ? Boolean(stored?.razorpayKeySecretSet)
    : Boolean(stored?.stripeSecretKeySet);

  // A connected account is one where both halves are on file. Switching
  // gateway means the new one has nothing stored yet.
  const connected =
    stored?.gateway === gateway && Boolean(storedKeyId) && secretStored;

  const dirty =
    gateway !== (stored?.gateway ?? "") ||
    accountHolderName !== (stored?.accountHolderName ?? "") ||
    keyId.trim() !== "" ||
    keySecret.trim() !== "";

  const reset = () => {
    setGateway(stored?.gateway ?? "");
    setAccountHolderName(stored?.accountHolderName ?? "");
    setKeyId("");
    setKeySecret("");
    setError(null);
  };

  const save = async () => {
    if (!gateway) {
      setError("Choose where your money should go first");
      return;
    }
    // Connecting for the first time needs both halves; an existing connection
    // can be left alone or replaced, but never half-replaced.
    if (!connected && (!keyId.trim() || !keySecret.trim())) {
      setError("Enter both keys to connect this account");
      return;
    }
    if ((keyId.trim() === "") !== (keySecret.trim() === "")) {
      setError("Replace both keys together, or neither");
      return;
    }

    setError(null);
    setSaving(true);
    try {
      // Only what the organizer actually typed is sent. Blank fields are
      // omitted so the stored values survive.
      const payload: Record<string, string> = { gateway };
      if (accountHolderName.trim()) {
        payload.accountHolderName = accountHolderName.trim();
      }
      if (keyId.trim()) {
        payload[isRazorpay ? "razorpayKeyId" : "stripePublishableKey"] =
          keyId.trim();
      }
      if (keySecret.trim()) {
        payload[isRazorpay ? "razorpayKeySecret" : "stripeSecretKey"] =
          keySecret.trim();
      }

      await axios.post("/api/payment-config", payload);

      const { data } = await axios.get<MaskedConfig>("/api/payment-config");
      setStored(data);
      setKeyId("");
      setKeySecret("");
      toast.success("Payment settings saved");
    } catch (requestError) {
      toast.error(
        errorMessage(requestError, "Could not save your payment settings")
      );
    } finally {
      setSaving(false);
    }
  };

  const keyLabels = isRazorpay
    ? { id: "Key ID", secret: "Key secret", placeholder: "rzp_live_…" }
    : { id: "Publishable key", secret: "Secret key", placeholder: "pk_live_…" };

  return (
    <FadeIn className="space-y-6">
      <SettingsSection
        title="Where your money goes"
        description="Buyers pay this account directly. Fever.lol never holds your ticket revenue."
        footer={
          gateway
            ? "Keys are encrypted before they are stored, and the secret is never sent back to your browser."
            : undefined
        }
      >
        <div className="space-y-1.5">
          <Label htmlFor="gateway">Payment provider</Label>
          <Select
            value={gateway}
            onValueChange={(value) => setGateway(value as Gateway)}
          >
            <SelectTrigger id="gateway" className="sm:max-w-sm">
              <SelectValue placeholder="Choose a provider" />
            </SelectTrigger>
            <SelectContent>
              {GATEWAYS.map((entry) => (
                <SelectItem key={entry.value} value={entry.value}>
                  {entry.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {gateway && (
            <p className="text-xs text-muted-foreground">
              {GATEWAYS.find((entry) => entry.value === gateway)?.note}
            </p>
          )}
        </div>

        {gateway && (
          <div className="space-y-1.5">
            <Label htmlFor="accountHolderName">Account name</Label>
            <Input
              id="accountHolderName"
              value={accountHolderName}
              onChange={(event) => setAccountHolderName(event.target.value)}
              placeholder="Lantern Collective Ltd"
              className="sm:max-w-sm"
            />
            <p className="text-xs text-muted-foreground">
              What buyers see on their card statement.
            </p>
          </div>
        )}
      </SettingsSection>

      {gateway && (
        <SettingsSection
          title="API keys"
          description={`From your ${
            isRazorpay ? "Razorpay" : "Stripe"
          } dashboard, under developers.`}
        >
          {connected && (
            <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/40 px-3 py-2.5">
              <Badge
                variant="outline"
                className="gap-1 border-success/30 bg-success/10 text-success"
              >
                <Check className="size-3" />
                Connected
              </Badge>
              <span className="font-mono text-xs text-muted-foreground">
                {storedKeyId}
              </span>
              <span className="text-xs text-muted-foreground">
                Secret on file
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="keyId">{keyLabels.id}</Label>
            <Input
              id="keyId"
              value={keyId}
              onChange={(event) => setKeyId(event.target.value)}
              placeholder={
                connected ? "Leave blank to keep the current key" : keyLabels.placeholder
              }
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="keySecret">{keyLabels.secret}</Label>
            <div className="relative">
              <Input
                id="keySecret"
                type={showSecret ? "text" : "password"}
                value={keySecret}
                onChange={(event) => setKeySecret(event.target.value)}
                placeholder={
                  connected ? "Leave blank to keep the current secret" : "••••••••"
                }
                autoComplete="off"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                aria-label={showSecret ? "Hide secret" : "Show secret"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showSecret ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {!connected && (
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              Until an account is connected, tickets for your events cannot be
              paid for.
            </p>
          )}
        </SettingsSection>
      )}

      <SaveBar
        visible={dirty}
        saving={saving}
        onSave={() => void save()}
        onReset={reset}
      />
    </FadeIn>
  );
}
