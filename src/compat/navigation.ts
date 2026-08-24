import { useEffect, useMemo, useState } from "preact/hooks";

export function navigate(url: string, replace = false) {
  const next = new URL(url, location.href);
  if (next.origin !== location.origin) { location.assign(next.href); return; }
  if (replace) history.replaceState(null, "", next.href);
  else history.pushState(null, "", next.href);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.requestAnimationFrame(() => {
    if (next.hash) document.getElementById(decodeURIComponent(next.hash.slice(1)))?.scrollIntoView({ behavior: "smooth" });
    else window.scrollTo({ top: 0, behavior: "auto" });
  });
}

export function useRouter() {
  return useMemo(() => ({
    push: (url: string) => navigate(url),
    replace: (url: string) => navigate(url, true),
    refresh: () => location.reload(),
    back: () => history.back(),
    prefetch: (_url: string) => undefined,
  }), []);
}
export function usePathname() {
  const [pathname, setPathname] = useState(location.pathname);
  useEffect(() => {
    const update = () => setPathname(location.pathname);
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  return pathname;
}
export const useSearchParams = () => new URLSearchParams(location.search);
