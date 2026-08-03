import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-[60vh] max-w-lg place-items-center px-6 text-center">
      <div>
        <p className="font-mono text-sm text-muted-foreground">404</p>
        <h1 className="mt-2 text-2xl font-semibold">
          There&apos;s nothing here
        </h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          The page may have moved, or the event may no longer be on sale.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
