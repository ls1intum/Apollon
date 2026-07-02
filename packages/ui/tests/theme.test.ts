import { describe, it, expect } from "vitest"

import { createApollonTheme, type ApollonTheme } from "@/theme"

describe("createApollonTheme", () => {
  it("maps typed tokens to their --apollon-* custom properties", () => {
    expect(
      createApollonTheme({
        primary: "#ff5722",
        foreground: "#fff",
        background: "#101010",
      })
    ).toEqual({
      "--apollon-primary": "#ff5722",
      "--apollon-foreground": "#fff",
      "--apollon-background": "#101010",
    })
  })

  it("only emits the keys that were provided (no fallbacks injected)", () => {
    const style = createApollonTheme({ primary: "blue" })
    expect(Object.keys(style)).toEqual(["--apollon-primary"])
  })

  it("returns an empty object for an empty theme", () => {
    expect(createApollonTheme({})).toEqual({})
  })

  it("maps every documented field to a distinct --apollon-* property", () => {
    // `Required<ApollonTheme>` forces this literal to list every field, so a field
    // added to the type without a mapping is a compile error here.
    const full: Required<ApollonTheme> = {
      primary: "1",
      primaryForeground: "2",
      foreground: "3",
      secondary: "4",
      background: "5",
      backgroundVariant: "6",
      gray: "7",
      grayVariant: "8",
      grid: "9",
      guideVertical: "10",
      guideHorizontal: "11",
      danger: "12",
      surface: "13",
      surfaceSunken: "14",
      border: "15",
      borderSubtle: "16",
      radius: "8px",
    }
    const style = createApollonTheme(full)
    // Every field produces exactly one --apollon-* property (a collision would
    // drop the key count below the field count).
    expect(Object.keys(style)).toHaveLength(Object.keys(full).length)
    expect(style["--apollon-danger"]).toBe("12")
    expect(style["--apollon-primary-foreground"]).toBe("2")
  })
})
