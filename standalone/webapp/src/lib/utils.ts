import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// shadcn's `cn` helper: clsx for conditional classes + tailwind-merge so a
// caller's className (e.g. h-[42px]) cleanly overrides a component default
// (e.g. h-9) instead of both ending up in the class list.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
