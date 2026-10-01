import { useMemo, useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
  const media = useMemo(() => window.matchMedia(query), [query]);
  const subscribe = useMemo(() => (notify: () => void) => {
    media.addEventListener("change", notify);
    return () => media.removeEventListener("change", notify);
  }, [media]);
  return useSyncExternalStore(subscribe, () => media.matches);
}
