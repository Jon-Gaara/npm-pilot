import { create } from "zustand"
import type { OverlayType } from "../types"
import { usePackageStore } from "./usePackageStore"

interface ConfirmPayload {
  type: "uninstall"
  pkgName: string
}

interface UIState {
  activeOverlay: OverlayType
  confirmPayload: ConfirmPayload | null
  installPackageName: string
  installVersion: string
  installSaveTarget: "dependencies" | "devDependencies" | "no-save"
  installExact: boolean

  openInstallDrawer: () => void
  closeOverlay: () => void
  requestUninstallConfirm: (pkgName: string) => void
  resolveConfirm: () => void
  setInstallPackageName: (name: string) => void
  setInstallVersion: (version: string) => void
  setInstallSaveTarget: (target: "dependencies" | "devDependencies" | "no-save") => void
  setInstallExact: (exact: boolean) => void
}

export const useUIStore = create<UIState>((set, get) => ({
  activeOverlay: null,
  confirmPayload: null,
  installPackageName: "",
  installVersion: "",
  installSaveTarget: "dependencies",
  installExact: false,

  openInstallDrawer: () =>
    set({
      activeOverlay: "install-drawer",
      confirmPayload: null,
      installPackageName: "",
      installVersion: "",
      installSaveTarget: "dependencies",
      installExact: false,
    }),

  closeOverlay: () => set({ activeOverlay: null, confirmPayload: null }),

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

  setInstallPackageName: (name) => set({ installPackageName: name }),
  setInstallVersion: (version) => set({ installVersion: version }),
  setInstallSaveTarget: (target) => set({ installSaveTarget: target }),
  setInstallExact: (exact) => set({ installExact: exact }),
}))
