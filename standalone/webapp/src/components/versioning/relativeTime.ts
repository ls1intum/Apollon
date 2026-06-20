import { versioningStrings as t } from "./strings"

/** Tiny relative-time formatter — no Intl polyfill, all strings via t. */
export function relativeTime(iso: string, now = Date.now()): string {
  const ms = new Date(iso).getTime()
  if (Number.isNaN(ms)) return ""
  const diff = Math.max(0, now - ms)
  const s = Math.floor(diff / 1000)
  if (s < 60) return t.justNow
  const m = Math.floor(s / 60)
  if (m < 60) return t.minutesAgo(m)
  const h = Math.floor(m / 60)
  if (h < 24) return t.hoursAgo(h)
  const d = Math.floor(h / 24)
  if (d < 30) return t.daysAgo(d)
  return new Date(iso).toLocaleDateString()
}
