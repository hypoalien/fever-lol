"use client";

import { ReactNode } from "react";

import { useSession } from "@/lib/auth-client";
import Loader from "./loader";

interface SessionWrapperProps {
  children: ReactNode;
}

/**
 * Better Auth's React client holds session state in its own store, so there is
 * no provider to mount — only the initial fetch to wait on.
 */
function AuthContent({ children }: { children: ReactNode }) {
  const { isPending } = useSession();

  if (isPending) {
    return <Loader className="absolute inset-0" />;
  }

  return <>{children}</>;
}

export default function SessionWrapper({ children }: SessionWrapperProps) {
  return <AuthContent>{children}</AuthContent>;
}
