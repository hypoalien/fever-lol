"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { FadeIn } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

/**
 * Settings shell.
 *
 * The section nav is the point. The sub-pages already existed but nothing
 * linked them, so the only way to reach one was to type the URL — and two of
 * them nested a second copy of the whole dashboard sidebar inside this layout.
 *
 * One column with a real measure. The previous form sat in a narrow strip with
 * a large empty gutter to its left, because the fields were indented inside a
 * card whose heading was not.
 */

const SECTIONS = [
  {
    href: "/dashboard/settings",
    label: "Profile",
    description: "Your name, organization and public page",
  },
  {
    href: "/dashboard/settings/payments",
    label: "Payments",
    description: "Where your ticket money goes",
  },
] as const;

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-6">
      <FadeIn>
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your account and how you get paid.
          </p>
        </header>
      </FadeIn>

      <div className="grid gap-8 md:grid-cols-[13rem_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="md:sticky md:top-6 md:self-start">
          <ul className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
            {SECTIONS.map((section) => {
              const active = pathname === section.href;
              return (
                <li key={section.href}>
                  <Link
                    href={section.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors md:whitespace-normal",
                      active
                        ? "bg-accent font-medium text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    )}
                  >
                    {section.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
