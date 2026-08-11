import { describe, it, expect } from "vitest"
import { isMajorUpgrade } from "../utils/semver"

describe("isMajorUpgrade", () => {
  it("4.x -> 5.x is a major upgrade", () => {
    expect(isMajorUpgrade("4.18.2", "5.0.0")).toBe(true)
  })

  it("4.x -> 6.x is a major upgrade", () => {
    expect(isMajorUpgrade("4.0.0", "6.1.0")).toBe(true)
  })

  it("4.x -> 4.x is NOT a major upgrade (minor/patch)", () => {
    expect(isMajorUpgrade("4.18.2", "4.21.0")).toBe(false)
  })

  it("4.x -> 5.x where current major is higher is not a major upgrade", () => {
    expect(isMajorUpgrade("6.0.0", "5.0.0")).toBe(false)
  })

  it("returns false when versions are not parseable", () => {
    expect(isMajorUpgrade("unknown", "5.0.0")).toBe(false)
    expect(isMajorUpgrade("4.0.0", "unknown")).toBe(false)
    expect(isMajorUpgrade("", "")).toBe(false)
  })
})
