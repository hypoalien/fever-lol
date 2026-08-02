"use client";

import { createContext, useContext, useMemo, useState } from "react";

import { useSession } from "@/lib/auth-client";
import { currencyOf, DEFAULT_CURRENCY } from "@/lib/currency";

type CurrencyContextType = {
  currency: string;
  setCurrency: (currency: string) => void;
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined
);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const sessionCurrency = currencyOf(session?.user);

  // Only holds a currency the user picked in this tab. The session value is
  // read directly below rather than copied into state by an effect, which
  // rendered once with a stale value before correcting itself.
  const [override, setOverride] = useState<string | null>(null);
  const currency = override ?? sessionCurrency ?? DEFAULT_CURRENCY;

  const value = useMemo(
    () => ({ currency, setCurrency: setOverride }),
    [currency]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
