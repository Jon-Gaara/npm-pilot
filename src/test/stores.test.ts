import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}))

import { invoke } from "@tauri-apps/api/core"
import { useProjectStore } from "../stores/useProjectStore"
import { usePackageStore } from "../stores/usePackageStore"
import { useSelectionStore } from "../stores/useSelectionStore"
import { useUIStore } from "../stores/useUIStore"
import type { NpmEnv, OutdatedInfo } from "../types"

const mockInvoke = invoke as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  useProjectStore.setState({
    screen: "welcome",
    mode: "local",
    projectInfo: null,
    env: null,
    envError: null,
  })
  usePackageStore.setState({
    outdated: {},
    installed: {},
    status: "idle",
    error: null,
    query: "",
    filters: { outdatedOnly: false, majorOnly: false, showOutdatedOnly: false },
    busyRows: new Set(),
    refreshGeneration: 0,
  })
  useSelectionStore.setState({ selected: new Set() })
  useUIStore.setState({
    activeOverlay: null,
    confirmPayload: null,
    installPackageName: "",
    installVersion: "",
    installSaveTarget: "dependencies",
    installExact: false,
  })
})

describe("useProjectStore", () => {
  it("starts with welcome screen and local mode", () => {
    const state = useProjectStore.getState()
    expect(state.screen).toBe("welcome")
    expect(state.mode).toBe("local")
    expect(state.projectInfo).toBeNull()
  })

  it("detectEnv calls invoke and stores env", async () => {
    const fakeEnv: NpmEnv = {
      node_version: "22.11.0",
      npm_version: "10.9.0",
      npm_source: "PATH",
      node_path: "",
      npm_path: "",
      global_prefix: "",
      global_prefix_writable: false,
      version_manager: "none",
    }
    mockInvoke.mockResolvedValueOnce(fakeEnv)

    await useProjectStore.getState().detectEnv()

    expect(mockInvoke).toHaveBeenCalledWith("detect_environment")
    const env = useProjectStore.getState().env
    expect(env?.node_version).toBe("22.11.0")
    expect(env?.npm_version).toBe("10.9.0")
  })

  it("detectEnv handles errors gracefully", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("cmd not found"))

    await useProjectStore.getState().detectEnv()

    expect(useProjectStore.getState().env).toBeNull()
    expect(useProjectStore.getState().envError).toBe("Error: cmd not found")
  })

  it("switchMode updates mode", async () => {
    useProjectStore.getState().switchMode("global")
    expect(useProjectStore.getState().mode).toBe("global")
  })

  it("enterGlobalMode sets screen and mode", async () => {
    await useProjectStore.getState().enterGlobalMode()
    const state = useProjectStore.getState()
    expect(state.screen).toBe("workbench")
    expect(state.mode).toBe("global")
    expect(state.projectInfo).toBeNull()
  })
})

describe("usePackageStore", () => {
  it("starts with empty state", () => {
    const state = usePackageStore.getState()
    expect(state.outdated).toEqual({})
    expect(state.installed).toEqual({})
    expect(state.status).toBe("idle")
  })

  it("setQuery updates search query", () => {
    usePackageStore.getState().setQuery("react")
    expect(usePackageStore.getState().query).toBe("react")
  })

  it("toggleFilter toggles filter value", () => {
    expect(usePackageStore.getState().filters.majorOnly).toBe(false)
    usePackageStore.getState().toggleFilter("majorOnly")
    expect(usePackageStore.getState().filters.majorOnly).toBe(true)
    usePackageStore.getState().toggleFilter("majorOnly")
    expect(usePackageStore.getState().filters.majorOnly).toBe(false)
  })

  it("toggleFilter toggles showOutdatedOnly", () => {
    usePackageStore.getState().toggleFilter("showOutdatedOnly")
    expect(usePackageStore.getState().filters.showOutdatedOnly).toBe(true)
  })

  it("setRowBusy marks and unmarks a package", () => {
    usePackageStore.getState().setRowBusy("express", true)
    expect(usePackageStore.getState().busyRows.has("express")).toBe(true)

    usePackageStore.getState().setRowBusy("express", false)
    expect(usePackageStore.getState().busyRows.has("express")).toBe(false)
  })

  it("fetchOutdated calls invoke and updates state", async () => {
    const fakeOutdated: Record<string, OutdatedInfo> = {
      express: { current: "4.18.2", wanted: "4.21.0", latest: "5.0.0", dep_type: "dependencies" },
      lodash: { current: "4.17.21", wanted: "4.17.21", latest: "4.17.21", dep_type: "dependencies" },
    }
    mockInvoke.mockResolvedValueOnce(fakeOutdated)

    await usePackageStore.getState().fetchOutdated()

    expect(mockInvoke).toHaveBeenCalledWith("npm_outdated")
    const outdated = usePackageStore.getState().outdated
    expect(outdated.express.current).toBe("4.18.2")
    expect(outdated.express.wanted).toBe("4.21.0")
    expect(outdated.lodash.current).toBe("4.17.21")
  })
})

describe("useSelectionStore", () => {
  it("starts with empty selection", () => {
    expect(useSelectionStore.getState().selected.size).toBe(0)
  })

  it("toggle adds and removes items", () => {
    useSelectionStore.getState().toggle("express")
    expect(useSelectionStore.getState().isSelected("express")).toBe(true)
    expect(useSelectionStore.getState().selected.size).toBe(1)

    useSelectionStore.getState().toggle("express")
    expect(useSelectionStore.getState().isSelected("express")).toBe(false)
    expect(useSelectionStore.getState().selected.size).toBe(0)
  })

  it("selectAll replaces selection", () => {
    useSelectionStore.getState().selectAll(["a", "b", "c"])
    expect(useSelectionStore.getState().selected.size).toBe(3)
    expect(useSelectionStore.getState().isSelected("a")).toBe(true)
    expect(useSelectionStore.getState().isSelected("b")).toBe(true)
    expect(useSelectionStore.getState().isSelected("c")).toBe(true)
  })

  it("clearAll removes all items", () => {
    useSelectionStore.getState().selectAll(["x", "y"])
    useSelectionStore.getState().clearAll()
    expect(useSelectionStore.getState().selected.size).toBe(0)
  })
})

describe("useUIStore", () => {
  it("starts with no overlay", () => {
    expect(useUIStore.getState().activeOverlay).toBeNull()
  })

  it("openInstallDrawer sets overlay", () => {
    useUIStore.getState().openInstallDrawer()
    expect(useUIStore.getState().activeOverlay).toBe("install-drawer")
  })

  it("closeOverlay clears all", () => {
    useUIStore.getState().openInstallDrawer()
    useUIStore.getState().closeOverlay()
    expect(useUIStore.getState().activeOverlay).toBeNull()
    expect(useUIStore.getState().confirmPayload).toBeNull()
  })

  it("requestUninstallConfirm sets payload", () => {
    useUIStore.getState().requestUninstallConfirm("express")
    expect(useUIStore.getState().activeOverlay).toBe("confirm-dialog")
    expect(useUIStore.getState().confirmPayload?.pkgName).toBe("express")
    expect(useUIStore.getState().confirmPayload?.type).toBe("uninstall")
  })
})
