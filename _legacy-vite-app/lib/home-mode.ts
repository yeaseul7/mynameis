export type HomeMode = "tempmode" | "salesmode";

export function getHomeMode(): HomeMode {
  return process.env.NEXT_PUBLIC_HOME_MODE === "salesmode" ? "salesmode" : "tempmode";
}
