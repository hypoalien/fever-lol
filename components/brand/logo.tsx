import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

/**
 * The mark: a torn ticket stub.
 *
 * A rounded square in the brand lime with a stub knocked out of it — two
 * notches where the perforation meets the top and bottom edges, and the tear
 * line running between them. It is the same device the landing page uses to
 * separate its sections. The mark before this was a play button in a circle,
 * which could have belonged to any media product and said nothing about
 * tickets.
 *
 * The stub is *cut out* of the tile rather than drawn on top of it. That is
 * what keeps it legible small: a thin light stroke over a fill is the first
 * thing to disappear at 16px, whereas a hole in a solid shape survives.
 *
 * Drawn as a filled tile because the previous version inherited currentColor
 * and sat as a dim outline in the dark sidebar — a logo should hold its own
 * colour, not borrow the surrounding text's.
 */
export function LogoMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
      {...props}
    >
      <mask
        id="fever-stub-mask"
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="32"
        height="32"
      >
        <rect width="32" height="32" rx="8" fill="#fff" />
        {/* Notches, at the ends of the tear line. */}
        <circle cx="20.5" cy="7" r="2.6" fill="#000" />
        <circle cx="20.5" cy="25" r="2.6" fill="#000" />
        {/* The perforation between them. */}
        <g stroke="#000" strokeWidth="2.4" strokeLinecap="round">
          <line x1="20.5" y1="12.2" x2="20.5" y2="13.6" />
          <line x1="20.5" y1="16.6" x2="20.5" y2="18" />
        </g>
        {/* The stub's own edges, so the tile reads as a ticket and not a
            rounded square with a dotted line in it. */}
        <rect
          x="5"
          y="7"
          width="22"
          height="18"
          rx="2"
          fill="none"
          stroke="#000"
          strokeWidth="2.4"
        />
      </mask>

      <rect
        width="32"
        height="32"
        rx="8"
        fill="currentColor"
        mask="url(#fever-stub-mask)"
      />
    </svg>
  );
}

/**
 * Mark plus wordmark, for headers and the sign-in screen.
 *
 * The word is set tighter than body copy and in the same ink as its
 * surroundings, so the lime tile is the only thing carrying colour.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className="size-7 text-[hsl(var(--secondary))]" />
      <span className="text-base font-semibold tracking-tight">Fever.lol</span>
    </span>
  );
}
