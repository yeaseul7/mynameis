"use client";

import { createPortal } from "react-dom";
import { FaPaw } from "react-icons/fa6";

export function CopyAlert({ message }: { message: string }) {
  if (!message || typeof document === "undefined") return null;
  return createPortal(<div className="copy-alert" role="status" aria-live="polite"><FaPaw aria-hidden="true" />{message}</div>, document.body);
}
