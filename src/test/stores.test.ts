import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}))

import { invoke } from "@tauri-apps/api/core"
import { useProjectStore } from "../stores/useProjectStore"
import { usePackageStore } from "../stores/usePackageStore"
import { useSelectionStore } from "../stores/useSelectionStore"
import { useUIStore } from "../stores/useUIStore"
import { useToastStore } from "../stores/useToastStore"
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
  useToastStore.setState({ toasts: [] })
  useUIStore.setState({
    activeOverlay: null,
    confirmPayload: null,
    scriptConfirm: null,
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

  it("upgradeOne installs when package has no scripts", async () => {
    usePackageStore.setState({
      outdated: { express: { current: "4.18.2", wanted: "4.21.0", latest: "5.0.0", dep_type: "dependencies" } },
    })
    mockInvoke.mockResolvedValueOnce({ has_scripts: false, allowed: false }) // check_install_scripts
    mockInvoke.mockResolvedValueOnce(undefined) // npm_install_pkg
    mockInvoke.mockResolvedValueOnce({ express: "4.21.0" }) // lightRefresh

    await usePackageStore.getState().upgradeOne("express", "wanted")

    expect(mockInvoke).toHaveBeenCalledWith("check_install_scripts", { pkg: "express", version: "4.21.0" })
    expect(mockInvoke).toHaveBeenCalledWith(
      "npm_install_pkg",
      expect.objectContaining({ pkgName: "express", version: "4.21.0", saveTarget: "dependencies" })
    )
    expect(usePackageStore.getState().outdated.express.current).toBe("4.21.0")
    expect(usePackageStore.getState().busyRows.has("express")).toBe(false)
  })

  it("upgradeOne cancels when user cancels script confirm", async () => {
    usePackageStore.setState({
      outdated: { express: { current: "4.18.2", wanted: "4.21.0", latest: "5.0.0", dep_type: "dependencies" } },
    })
    mockInvoke.mockResolvedValueOnce({ has_scripts: true, allowed: false })

    const promise = usePackageStore.getState().upgradeOne("express", "wanted")
    await new Promise((r) => setTimeout(r, 0))
    expect(useUIStore.getState().activeOverlay).toBe("script-confirm")
    useUIStore.getState().resolveScriptConfirm("cancel")
    await promise

    expect(usePackageStore.getState().busyRows.has("express")).toBe(false)
    expect(mockInvoke).not.toHaveBeenCalledWith("npm_install_pkg", expect.anything())
  })

  it("upgradeOne omits saveTarget in global mode", async () => {
    useProjectStore.setState({ mode: "global" })
    usePackageStore.setState({
      outdated: { foo: { current: "1.0.0", wanted: "1.2.0", latest: "2.0.0", dep_type: "global" } },
    })
    mockInvoke.mockResolvedValueOnce({ has_scripts: false, allowed: false }) // check_install_scripts
    mockInvoke.mockResolvedValueOnce(undefined) // npm_install_pkg
    mockInvoke.mockResolvedValueOnce({ foo: "1.2.0" }) // lightRefresh (npm_ls_global)

    await usePackageStore.getState().upgradeOne("foo", "wanted")

    const call = mockInvoke.mock.calls.find((c) => c[0] === "npm_install_pkg")
    expect(call).toBeDefined()
    expect(call![1].pkgName).toBe("foo")
    expect(call![1].saveTarget).toBeUndefined()
    useProjectStore.setState({ mode: "local" })
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

  it("ensureScriptsConfirmed proceeds when no scripts", async () => {
    mockInvoke.mockResolvedValueOnce({ has_scripts: false, allowed: false })
    const decision = await useUIStore.getState().ensureScriptsConfirmed("react", "1.0.0")
    expect(decision).toBe("proceed")
    expect(mockInvoke).toHaveBeenCalledWith("check_install_scripts", { pkg: "react", version: "1.0.0" })
  })

  it("ensureScriptsConfirmed proceeds when already allowed", async () => {
    mockInvoke.mockResolvedValueOnce({ has_scripts: true, allowed: true })
    const decision = await useUIStore.getState().ensureScriptsConfirmed("opencode-ai", "")
    expect(decision).toBe("proceed")
  })

  it("ensureScriptsConfirmed opens dialog when blocked and returns choice", async () => {
    mockInvoke.mockResolvedValueOnce({ has_scripts: true, allowed: false })

    const promise = useUIStore.getState().ensureScriptsConfirmed("@scope/pkg", "1.0.0")
    // 等待 dialog 状态设置
    await new Promise((r) => setTimeout(r, 0))
    expect(useUIStore.getState().activeOverlay).toBe("script-confirm")
    expect(useUIStore.getState().scriptConfirm?.pkg).toBe("@scope/pkg")

    useUIStore.getState().resolveScriptConfirm("allow")
    const decision = await promise
    expect(decision).toBe("allow")
    expect(useUIStore.getState().activeOverlay).toBeNull()
  })

  it("ensureScriptsConfirmed proceeds on check error", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("network"))
    const decision = await useUIStore.getState().ensureScriptsConfirmed("react", "")
    expect(decision).toBe("proceed")
  })
})

describe("useToastStore", () => {
  it("starts empty", () => {
    expect(useToastStore.getState().toasts).toEqual([])
  })

  it("push adds a toast", () => {
    useToastStore.getState().push("已安装 react", "success")
    const toasts = useToastStore.getState().toasts
    expect(toasts.length).toBe(1)
    expect(toasts[0].message).toBe("已安装 react")
    expect(toasts[0].type).toBe("success")
  })

  it("remove deletes a toast", () => {
    useToastStore.getState().push("message", "info")
    const id = useToastStore.getState().toasts[0].id
    useToastStore.getState().remove(id)
    expect(useToastStore.getState().toasts).toEqual([])
  })
})
