import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// The backend stores and returns timestamps as UTC ISO strings (e.g.
// "2026-06-19T07:23:00+00:00"). Every place we *display* a clock-in/out
// time needs to convert that into the viewer's local time, exactly like
// the live clock-in screen does with `new Date().toLocaleTimeString(...)`.
// Without this, history/admin tables show the raw UTC hour instead of the
// local hour the action actually happened at.
export function formatLocalTime(isoString: string | null | undefined): string {
  if (!isoString) return "—"
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return isoString
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}
