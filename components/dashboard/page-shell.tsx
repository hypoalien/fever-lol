"use client";

import type { ReactNode } from "react";

import { FadeIn } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

/**
 * The frame every module page sits in.
 *
 * Each page used to invent its own container, padding and heading — orders and
 * attendees had no heading at all, discounts had one at a different size, and
 * the gutters disagreed. A shared shell means moving between sections does not
 * move the content under the cursor.
 */
export function PageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("container mx-auto space-y-6 p-4 md:p-6", className)}>
      {children}
    </div>
  );
}

/**
 * Title, one line of orientation, and the page's primary action.
 *
 * The description says what the page holds and what the organizer can do from
 * it, rather than restating the title.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <FadeIn>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </FadeIn>
  );
}

/**
 * What a page shows when a fetch fails.
 *
 * Explains what could not be loaded and offers the one thing worth trying,
 * rather than a bare "Something went wrong" with no way forward.
 */
export function LoadError({
  title,
  onRetry,
}: {
  title: string;
  onRetry: () => void;
}) {
  return (
    <div className="grid min-h-[40vh] place-items-center rounded-lg border border-dashed p-6 text-center">
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The request did not come back. It may just be the connection.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

/**
 * What a page shows when there is genuinely nothing to show.
 *
 * An empty screen is an invitation to act, so it names the next step instead of
 * announcing the absence and stopping there.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <FadeIn>
      <div className="grid place-items-center rounded-lg border border-dashed py-16 text-center">
        <div className="max-w-sm">
          <div className="mx-auto grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
            {icon}
          </div>
          <p className="mt-4 font-medium">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          {action ? <div className="mt-5">{action}</div> : null}
        </div>
      </div>
    </FadeIn>
  );
}
