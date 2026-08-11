import { describe, it, expect } from "vitest"
import { extractBlockedPackage } from "../stores/useTerminalStore"

describe("extractBlockedPackage", () => {
  it("extracts scoped package name", () => {
    const line = "npm warn install-scripts   @alibaba-group/open-code-review@1.9.0 (postinstall: node scripts/install.js)"
    expect(extractBlockedPackage(line)).toBe("@alibaba-group/open-code-review")
  })

  it("extracts plain package name", () => {
    const line = "npm warn install-scripts   opencode-ai@1.18.15 (postinstall: node ./postinstall.mjs)"
    expect(extractBlockedPackage(line)).toBe("opencode-ai")
  })

  it("extracts package with install script", () => {
    const line = "npm warn install-scripts   esbuild@0.28.1 (postinstall: node install.js)"
    expect(extractBlockedPackage(line)).toBe("esbuild")
  })

  it("returns null for summary line", () => {
    const line = "npm warn install-scripts 1 package had install scripts blocked because they are not covered by allowScripts:"
    expect(extractBlockedPackage(line)).toBeNull()
  })

  it("returns null for suggestion line", () => {
    const line = "npm warn install-scripts Run `npm config set allow-scripts=opencode-ai --location=user` to allow them."
    expect(extractBlockedPackage(line)).toBeNull()
  })

  it("returns null for unrelated line", () => {
    expect(extractBlockedPackage("added 57 packages in 3s")).toBeNull()
  })

  it("returns null for empty line", () => {
    expect(extractBlockedPackage("")).toBeNull()
  })
})
