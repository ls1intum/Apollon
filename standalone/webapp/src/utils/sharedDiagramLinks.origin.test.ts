import { afterEach, describe, expect, it, vi } from "vitest"
import { DiagramView } from "@/types"

// These mocks must be hoisted before the module under test imports them.
const { isNativePlatform, serverURLRef } = vi.hoisted(() => ({
  isNativePlatform: vi.fn(() => false),
  serverURLRef: { value: "" },
}))

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform },
}))

vi.mock("@/constants", () => ({
  get serverURL() {
    return serverURLRef.value
  },
}))

import { resolveShareOrigin, buildSharedDiagramUrl } from "./sharedDiagramLinks"

afterEach(() => {
  isNativePlatform.mockReturnValue(false)
  serverURLRef.value = ""
})

describe("resolveShareOrigin (native-aware share origin)", () => {
  it("uses the configured web host on native Capacitor builds", () => {
    isNativePlatform.mockReturnValue(true)
    serverURLRef.value = "https://apollon.example"

    expect(resolveShareOrigin()).toBe("https://apollon.example")
    expect(buildSharedDiagramUrl("abc", DiagramView.EDIT)).toBe(
      `https://apollon.example/shared/abc?view=${DiagramView.EDIT}`
    )
  })

  it("falls back to the page origin on the web", () => {
    isNativePlatform.mockReturnValue(false)
    serverURLRef.value = "https://apollon.example"

    // jsdom default origin.
    expect(resolveShareOrigin()).toBe(window.location.origin)
    expect(buildSharedDiagramUrl("abc", DiagramView.EDIT)).toBe(
      `${window.location.origin}/shared/abc?view=${DiagramView.EDIT}`
    )
  })

  it("falls back to the page origin on native when no server host is set", () => {
    isNativePlatform.mockReturnValue(true)
    serverURLRef.value = ""

    expect(resolveShareOrigin()).toBe(window.location.origin)
  })
})
