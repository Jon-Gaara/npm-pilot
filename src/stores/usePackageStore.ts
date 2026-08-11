import { create } from "zustand"
import { invoke } from "@tauri-apps/api/core"
import type { OutdatedInfo, AppMode } from "../types"
import { useTerminalStore } from "./useTerminalStore"
import { useProjectStore } from "./useProjectStore"
import { useUIStore } from "./useUIStore"

type FetchStatus = "idle" | "loading" | "success" | "error"
type SortBy = "name" | "upgrade-gap" | "type"

interface Filters {
  outdatedOnly: boolean
  majorOnly: boolean
  showOutdatedOnly: boolean
}

interface PackageState {
  outdated: Record<string, OutdatedInfo>
  installed: Record<string, string>
  status: FetchStatus
  error: string | null
  query: string
  sortBy: SortBy
  filters: Filters
  busyRows: Set<string>
  refreshGeneration: number

  fetchOutdated: () => Promise<void>
  fetchGlobalList: () => Promise<void>
  fetchGlobalOutdated: () => Promise<void>
  lightRefresh: (mode?: AppMode) => Promise<void>
  setQuery: (q: string) => void
  setSortBy: (s: SortBy) => void
  toggleFilter: (key: keyof Filters) => void
  setRowBusy: (name: string, busy: boolean) => void
  upgradeOne: (name: string, target: "wanted" | "latest") => Promise<void>
  uninstallOne: (name: string) => Promise<void>
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null

function scheduleFullRefresh(mode?: AppMode) {
  if (refreshTimer) clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => {
    refreshTimer = null
    const currentMode = mode || useProjectStore.getState().mode
    if (currentMode === "global") {
      usePackageStore.getState().fetchGlobalOutdated()
    } else {
      usePackageStore.getState().fetchOutdated()
    }
  }, 3000)
}

export const usePackageStore = create<PackageState>((set, get) => ({
  outdated: {},
  installed: {},
  status: "idle",
  error: null,
  query: "",
  sortBy: "name",
  filters: { outdatedOnly: false, majorOnly: false, showOutdatedOnly: false },
  busyRows: new Set(),
  refreshGeneration: 0,

  fetchOutdated: async () => {
    set({ status: "loading", error: null })
    const gen = get().refreshGeneration
    try {
      const data = await invoke<Record<string, OutdatedInfo>>("npm_outdated")
      if (get().refreshGeneration !== gen) return
      set({ outdated: data, status: "success" })
    } catch (err) {
      if (get().refreshGeneration !== gen) return
      set({ status: "error", error: String(err) })
    }
  },

  fetchGlobalList: async () => {
    set({ status: "loading", error: null })
    try {
      const data = await invoke<Record<string, string>>("npm_ls_global")
      set({ installed: data, status: "success" })
    } catch (err) {
      set({ status: "error", error: String(err) })
    }
  },

  fetchGlobalOutdated: async () => {
    set({ status: "loading", error: null })
    try {
      const data = await invoke<Record<string, OutdatedInfo>>("npm_outdated_global")
      set({ outdated: data, status: "success" })
    } catch (err) {
      set({ status: "error", error: String(err) })
    }
  },

  lightRefresh: async (mode?: AppMode) => {
    const currentMode = mode || useProjectStore.getState().mode
    try {
      const cmd = currentMode === "global" ? "npm_ls_global" : "npm_ls_depth0"
      const installed = await invoke<Record<string, string>>(cmd)
      set((s) => {
        const patched = { ...s.outdated }
        for (const [name, version] of Object.entries(installed)) {
          if (patched[name]) {
            patched[name] = { ...patched[name], current: version }
          }
        }
        return { installed, outdated: patched }
      })
    } catch {
      /* silent */
    }
  },

  setQuery: (query) => set({ query }),
  setSortBy: (sortBy) => set({ sortBy }),
  toggleFilter: (key) =>
    set((s) => ({ filters: { ...s.filters, [key]: !s.filters[key] } })),

  setRowBusy: (name, busy) =>
    set((s) => {
      const next = new Set(s.busyRows)
      busy ? next.add(name) : next.delete(name)
      return { busyRows: next }
    }),

  upgradeOne: async (name, target) => {
    const { outdated, setRowBusy } = get()
    const info = outdated[name]
    if (!info) return

    // 如果 wanted 和 current 相同，自动切到 latest
    const effectiveTarget = (target === "wanted" && info.wanted === info.current) ? "latest" : target
    const version = effectiveTarget === "wanted" ? info.wanted : info.latest
    setRowBusy(name, true)
    set((s) => ({ refreshGeneration: s.refreshGeneration + 1 }))

    const terminalStore = useTerminalStore.getState()

    // 安装前确认脚本：'proceed' 直接装，'allow' 先放行，'skip' 跳过脚本装，'cancel' 中止
    const decision = await useUIStore.getState().ensureScriptsConfirmed(name, version)
    if (decision === "cancel") {
      setRowBusy(name, false)
      return
    }
    if (decision === "allow") {
      try {
        await invoke("add_allow_scripts", { pkg: name })
      } catch (err) {
        terminalStore.pushError(`放行失败: ${String(err)}`)
        setRowBusy(name, false)
        return
      }
    }

    terminalStore.startOperation(`npm install ${name}@${version}`)

    try {
      await invoke("npm_install_pkg", {
        pkgName: name,
        version: version,
        saveTarget: info.dep_type === "devDependencies" ? "devDependencies" : "dependencies",
        exact: false,
      })
      // 事件监听器会自动调用 endOperation，这里不重复调用
      set((s) => ({
        outdated: {
          ...s.outdated,
          [name]: { ...s.outdated[name], current: version },
        },
      }))
      get().lightRefresh()
      scheduleFullRefresh()
    } catch (err) {
      terminalStore.pushError(String(err))
    } finally {
      setRowBusy(name, false)
    }
  },

  uninstallOne: async (name) => {
    const { setRowBusy } = get()
    setRowBusy(name, true)

    const terminalStore = useTerminalStore.getState()
    terminalStore.startOperation(`npm uninstall ${name}`)

    try {
      await invoke("npm_uninstall_pkg", { pkgName: name })
      // 事件监听器会自动调用 endOperation，这里不重复调用
      get().lightRefresh()
      scheduleFullRefresh()
    } catch (err) {
      terminalStore.pushError(String(err))
    } finally {
      setRowBusy(name, false)
    }
  },
}))
