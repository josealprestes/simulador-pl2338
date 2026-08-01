import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type KpiStatus = "success" | "warning" | "danger" | "info";

export interface KpiThresholds {
  min: number;
  max: number;
  direction: "up" | "down"; // up: higher is better, down: lower is better
  warningThreshold: number; // percentage of the range (0-1)
}

export function getKpiStatus(
  value: number,
  thresholds?: KpiThresholds
): KpiStatus {
  if (!thresholds) return "info";

  const { min, max, direction, warningThreshold } = thresholds;
  const range = max - min;
  const normalizedValue = (value - min) / range;

  if (direction === "up") {
    if (normalizedValue >= 1) return "success";
    if (normalizedValue >= warningThreshold) return "warning";
    return "danger";
  } else {
    if (normalizedValue <= 0) return "success";
    if (normalizedValue <= 1 - warningThreshold) return "warning";
    return "danger";
  }
}
