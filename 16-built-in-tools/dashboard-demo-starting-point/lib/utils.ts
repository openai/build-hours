import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function truncate(text: string, max: number) {
  if (!text) return text;
  return text.length > max ? text.slice(0, max) + "..." : text;
}
