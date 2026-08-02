import type { ReactNode } from "react";

/**
 * One group of related settings.
 *
 * A heading, a sentence of context, then the fields. The previous screen put
 * everything in a single undifferentiated card, so "Organization URL" and
 * "Preferred Currency" — which have nothing to do with each other and very
 * different consequences — sat in the same visual run.
 */
export function SettingsSection({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-card">
      <div className="border-b px-5 py-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-5 p-5">{children}</div>
      {footer && (
        <div className="border-t bg-muted/30 px-5 py-3 text-sm text-muted-foreground">
          {footer}
        </div>
      )}
    </section>
  );
}

/** Two fields side by side on wide screens, stacked on narrow ones. */
export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2">{children}</div>;
}
