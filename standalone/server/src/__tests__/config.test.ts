import { describe, expect, it } from "vitest"
import { isDefaultOwnerSecret, loadConfig } from "../config"

describe("loadConfig", () => {
  describe("OWNER_SECRET production guard", () => {
    it("refuses to boot when the canonical default sentinel is set in production", () => {
      expect(() =>
        loadConfig({
          NODE_ENV: "production",
          OWNER_SECRET: "development-only-replace-in-prod",
        })
      ).toThrow(/OWNER_SECRET/i)
    })

    it("refuses typo variants of the default sentinel in production", () => {
      expect(() =>
        loadConfig({
          NODE_ENV: "production",
          OWNER_SECRET: "development-only-replace-in-production",
        })
      ).toThrow(/OWNER_SECRET/i)
      expect(() =>
        loadConfig({
          NODE_ENV: "production",
          OWNER_SECRET: "DEVELOPMENT-ONLY-REPLACE-IN-PROD",
        })
      ).toThrow(/OWNER_SECRET/i)
    })

    it("accepts a real secret in production", () => {
      const config = loadConfig({
        NODE_ENV: "production",
        OWNER_SECRET: "9f3a2b1c8e7d6f5a4b3c2d1e0f9a8b7c",
      })
      expect(config.OWNER_SECRET).toBe("9f3a2b1c8e7d6f5a4b3c2d1e0f9a8b7c")
    })

    it("permits the default sentinel outside production", () => {
      const dev = loadConfig({
        NODE_ENV: "development",
        OWNER_SECRET: "development-only-replace-in-prod",
      })
      expect(dev.OWNER_SECRET).toBe("development-only-replace-in-prod")
    })
  })

  describe("isDefaultOwnerSecret", () => {
    it("matches the canonical sentinel", () => {
      expect(isDefaultOwnerSecret("development-only-replace-in-prod")).toBe(
        true
      )
    })

    it("matches the prefix and case-insensitive variants", () => {
      expect(
        isDefaultOwnerSecret("development-only-replace-in-production")
      ).toBe(true)
      expect(isDefaultOwnerSecret("DEVELOPMENT-ONLY-REPLACE-x")).toBe(true)
    })

    it("rejects strings that don't match the prefix", () => {
      expect(isDefaultOwnerSecret("9f3a2b1c8e7d6f5a4b3c2d1e0f9a8b7c")).toBe(
        false
      )
      expect(isDefaultOwnerSecret("dev-secret")).toBe(false)
    })
  })
})
