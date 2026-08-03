"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";

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
  const [currency, setCurrency] = useState<string>(
    sessionCurrency ?? DEFAULT_CURRENCY
  );

  useEffect(() => {
    if (sessionCurrency) {
      setCurrency(sessionCurrency);
    }
  }, [sessionCurrency]);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
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
