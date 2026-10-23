import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Collision-free ID such as "phase-3f2a…". randomUUID only exists in secure
// contexts (https or localhost), so fall back to getRandomValues elsewhere.
export function generateId(prefix: string) {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return `${prefix}-${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`
}
