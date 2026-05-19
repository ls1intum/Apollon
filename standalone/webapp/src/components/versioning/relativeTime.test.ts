import { describe, expect, it } from "vitest"
import { relativeTime } from "./relativeTime"

const now = new Date("2026-04-29T12:00:00Z").getTime()

describe("relativeTime", () => {
  it("returns 'just now' for under a minute", () => {
    expect(relativeTime("2026-04-29T11:59:31Z", now)).toBe("just now")
    expect(relativeTime("2026-04-29T12:00:00Z", now)).toBe("just now")
  })

  it("floors to minutes (no rounding-up bug)", () => {
    // 90s ago should report 1m, not 2m. Math.round would have said 2m.
    expect(relativeTime("2026-04-29T11:58:30Z", now)).toBe("1m ago")
  })

  it("formats minutes / hours / days separately", () => {
    expect(relativeTime("2026-04-29T11:55:00Z", now)).toBe("5m ago")
    expect(relativeTime("2026-04-29T09:00:00Z", now)).toBe("3h ago")
    expect(relativeTime("2026-04-26T12:00:00Z", now)).toBe("3d ago")
  })

  it("falls back to a locale date for older entries", () => {
    const out = relativeTime("2026-01-01T00:00:00Z", now)
    // Locale-dependent but always non-empty and not a relative-time phrase.
    expect(out).not.toMatch(/ago|just now/)
    expect(out.length).toBeGreaterThan(0)
  })

  it("handles malformed input safely", () => {
    expect(relativeTime("not-a-date", now)).toBe("")
  })

  it("never returns negative durations for clock skew", () => {
    expect(relativeTime("2026-04-29T13:00:00Z", now)).toBe("just now")
  })
})
