import { defineConfig, loadEnv } from "vite";
import preact from "@preact/preset-vite";
import { vitePrerenderPlugin } from "vite-prerender-plugin";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      preact(),
      vitePrerenderPlugin({
        renderTarget: "#app",
        prerenderScript: path.resolve(__dirname, "src/prerender.tsx"),
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
        "next/link": path.resolve(__dirname, "src/compat/link.tsx"),
        "next/image": path.resolve(__dirname, "src/compat/image.tsx"),
        "next/navigation": path.resolve(__dirname, "src/compat/navigation.ts"),
        "next/headers": path.resolve(__dirname, "src/compat/server-only.ts"),
      },
    },
    define: {
      "process.env.NEXT_PUBLIC_SUPABASE_URL": JSON.stringify(env.VITE_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL),
      "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": JSON.stringify(env.VITE_SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      "process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY": JSON.stringify(env.VITE_KAKAO_JAVASCRIPT_KEY ?? env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY),
      "process.env.NEXT_PUBLIC_SITE_URL": JSON.stringify(env.VITE_SITE_URL ?? env.NEXT_PUBLIC_SITE_URL ?? "https://www.mynameis.life"),
    },
    build: { target: "es2022" },
  };
});
