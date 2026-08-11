import { create } from "zustand"
import { invoke } from "@tauri-apps/api/core"
import type { OverlayType } from "../types"
import { usePackageStore } from "./usePackageStore"
import { useTerminalStore } from "./useTerminalStore"

interface ConfirmPayload {
  type: "uninstall"
  pkgName: string
}

export type ScriptChoice = "allow" | "skip" | "cancel"
export type ScriptDecision = "proceed" | ScriptChoice

interface ScriptConfirm {
  pkg: string
  version: string
  resolve: (choice: ScriptChoice) => void
}

interface UIState {
  activeOverlay: OverlayType
  confirmPayload: ConfirmPayload | null
  scriptConfirm: ScriptConfirm | null
  installPackageName: string
  installVersion: string
  installSaveTarget: "dependencies" | "devDependencies" | "no-save"
  installExact: boolean

  openInstallDrawer: () => void
  closeOverlay: () => void
  requestUninstallConfirm: (pkgName: string) => void
  resolveConfirm: () => void
  requestScriptConfirm: (pkg: string, version: string) => Promise<ScriptChoice>
  resolveScriptConfirm: (choice: ScriptChoice) => void
  ensureScriptsConfirmed: (pkg: string, version: string) => Promise<ScriptDecision>
  setInstallPackageName: (name: string) => void
  setInstallVersion: (version: string) => void
  setInstallSaveTarget: (target: "dependencies" | "devDependencies" | "no-save") => void
  setInstallExact: (exact: boolean) => void
}

export const useUIStore = create<UIState>((set, get) => ({
  activeOverlay: null,
  confirmPayload: null,
  scriptConfirm: null,
  installPackageName: "",
  installVersion: "",
  installSaveTarget: "dependencies",
  installExact: false,

  openInstallDrawer: () =>
    set({
      activeOverlay: "install-drawer",
      confirmPayload: null,
      scriptConfirm: null,
      installPackageName: "",
      installVersion: "",
      installSaveTarget: "dependencies",
      installExact: false,
    }),

  closeOverlay: () =>
    set({ activeOverlay: null, confirmPayload: null, scriptConfirm: null }),

  requestUninstallConfirm: (pkgName) =>
    set({
      activeOverlay: "confirm-dialog",
      confirmPayload: { type: "uninstall", pkgName },
    }),

  resolveConfirm: () => {
    const { confirmPayload } = get()
    if (confirmPayload?.type === "uninstall") {
      usePackageStore.getState().uninstallOne(confirmPayload.pkgName)
    }
    set({ activeOverlay: null, confirmPayload: null })
  },

  requestScriptConfirm: (pkg, version) =>
    new Promise<ScriptChoice>((resolve) => {
      set({ activeOverlay: "script-confirm", scriptConfirm: { pkg, version, resolve } })
    }),

  resolveScriptConfirm: (choice) => {
    const { scriptConfirm } = get()
    scriptConfirm?.resolve(choice)
    set({ activeOverlay: null, scriptConfirm: null })
  },

  ensureScriptsConfirmed: async (pkg, version) => {
    try {
      const check = await invoke<{ has_scripts: boolean; allowed: boolean }>(
        "check_install_scripts",
        { pkg, version: version || null }
      )
      if (!check.has_scripts || check.allowed) {
        return "proceed"
      }
      return await get().requestScriptConfirm(pkg, version)
    } catch (err) {
      useTerminalStore.getState().pushError(`脚本检查失败: ${String(err)}`)
      return "proceed"
    }
  },

  setInstallPackageName: (name) => set({ installPackageName: name }),
  setInstallVersion: (version) => set({ installVersion: version }),
  setInstallSaveTarget: (target) => set({ installSaveTarget: target }),
  setInstallExact: (exact) => set({ installExact: exact }),
}))
