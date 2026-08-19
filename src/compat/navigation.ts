import { useMemo } from "preact/hooks";

export function useRouter() {
  return useMemo(() => ({
    push: (url: string) => location.assign(url),
    replace: (url: string) => location.replace(url),
    refresh: () => location.reload(),
    back: () => history.back(),
    prefetch: (_url: string) => undefined,
  }), []);
}
export const usePathname = () => location.pathname;
export const useSearchParams = () => new URLSearchParams(location.search);
