import * as React from "react";

const MOBILE_BREAKPOINT = 768;

const query = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

/**
 * Tracks whether the viewport is phone-sized.
 *
 * Uses useSyncExternalStore rather than an effect that calls setState on
 * mount. The effect version rendered once with the wrong answer and then
 * immediately re-rendered, which is a visible flash on any layout that
 * branches on it — and is what react-hooks/set-state-in-effect was flagging.
 */
function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(query);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(query).matches;
}

/** The server has no viewport; assume desktop and let hydration correct it. */
function getServerSnapshot(): boolean {
  return false;
}

export function useIsMobile(): boolean {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
