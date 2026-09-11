import renderToString from "preact-render-to-string";
import { Header } from "@/components/header";
import { GuestHome } from "@/app/page";

export function prerender() {
  return {
    html: renderToString(
      <>
        <Header />
        <main className="app-shell">
          <GuestHome />
        </main>
      </>,
    ),
    links: new Set<string>(),
  };
}
