export type HomeMode = "tempmode" | "salesmode";

export function getHomeMode(): HomeMode {
  return process.env.VITE_PUBLIC_HOME_MODE === "salesmode" ? "salesmode" : "tempmode";
}
