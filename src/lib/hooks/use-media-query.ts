"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Tracks whether a CSS media query currently matches. Uses
 * `useSyncExternalStore` so it stays correct across SSR/hydration without
 * synchronous setState in an effect.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", callback);
      return () => media.removeEventListener("change", callback);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
