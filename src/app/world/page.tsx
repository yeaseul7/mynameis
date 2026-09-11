"use client";

import dynamic from "next/dynamic";

const WorldClient = dynamic(() => import("@/features/world/WorldClient"), { ssr: false });

export default function WorldPage() {
  return <WorldClient />;
}
