import { afterEach, describe, expect, it, vi } from "vitest"
// Import the REAL implementation (no mock): we are verifying that generateUUID
// emits spec-conformant, collision-free v4 UUIDs from a CSPRNG, which only a
// real crypto-backed run can prove.
import { generateUUID } from "@/constants"

// RFC 4122 v4: 8-4-4-4-12 hex, version nibble fixed to `4`, variant nibble in
// {8,9,a,b} (the high bits `10`).
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const SAMPLE_COUNT = 10_000

describe("generateUUID", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("emits spec-conformant v4 UUIDs across a large sample", () => {
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      expect(generateUUID()).toMatch(UUID_V4)
    }
  })

  it("does not collide across a large sample", () => {
    const samples = Array.from({ length: SAMPLE_COUNT }, () => generateUUID())
    expect(new Set(samples).size).toBe(samples.length)
  })

  it("draws randomness from crypto.getRandomValues, never Math.random", () => {
    // spyOn keeps the original implementation, so the UUID is still real.
    const getRandomValues = vi.spyOn(crypto, "getRandomValues")
    const mathRandom = vi.spyOn(Math, "random")

    const uuid = generateUUID()

    expect(uuid).toMatch(UUID_V4)
    expect(getRandomValues).toHaveBeenCalled()
    expect(mathRandom).not.toHaveBeenCalled()
  })
})
