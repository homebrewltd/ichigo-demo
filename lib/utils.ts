import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FormatTime {
  (seconds: number): string;
}

export const formatTime: FormatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

export function formatCompactNumber(count: number) {
  const formatter = Intl.NumberFormat("en", { notation: "compact" });
  return formatter.format(count);
}
