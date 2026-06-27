import { describe, it, expect } from "vitest"

import { createApollonTheme, type ApollonTheme } from "@/theme"

describe("createApollonTheme", () => {
  it("maps typed tokens to their --apollon-* custom properties", () => {
    expect(
      createApollonTheme({
        primary: "#ff5722",
        primaryContrast: "#fff",
        background: "#101010",
      })
    ).toEqual({
      "--apollon-primary": "#ff5722",
      "--apollon-primary-contrast": "#fff",
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

  it("covers the full documented token surface", () => {
    const full: Required<ApollonTheme> = {
      primary: "1",
      primaryContrast: "2",
      secondary: "3",
      background: "4",
      backgroundInverse: "5",
      backgroundVariant: "6",
      gray: "7",
      grayVariant: "8",
      grid: "9",
      guideVertical: "10",
      guideHorizontal: "11",
      warning: "12",
      warningBackground: "13",
      warningBorder: "14",
      danger: "15",
      dangerBackground: "16",
      dangerBorder: "17",
      surface: "18",
      surfaceSunken: "19",
      surfaceHover: "20",
      border: "21",
      borderSubtle: "22",
      radius: "8px",
    }
    const style = createApollonTheme(full)
    // Every field produces exactly one --apollon-* property.
    expect(Object.keys(style)).toHaveLength(Object.keys(full).length)
    expect(
      Object.keys(style).every((key) => key.startsWith("--apollon-"))
    ).toBe(true)
    expect(style["--apollon-alert-warning-yellow"]).toBe("12")
    expect(style["--apollon-guide-vertical"]).toBe("10")
  })
})
