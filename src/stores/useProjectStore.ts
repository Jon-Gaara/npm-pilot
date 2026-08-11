import { create } from "zustand"
import { invoke } from "@tauri-apps/api/core"
import type { NpmEnv, ProjectInfo, Screen, AppMode } from "../types"

interface ProjectState {
  screen: Screen
  mode: AppMode
  projectInfo: ProjectInfo | null
  env: NpmEnv | null
  envError: string | null

  detectEnv: () => Promise<void>
  openProject: (path: string) => Promise<void>
  enterGlobalMode: () => Promise<void>
  switchMode: (mode: AppMode) => Promise<void>
  openFolderDialog: () => Promise<void>
  initPackageJson: () => Promise<void>
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  screen: "welcome",
  mode: "local",
  projectInfo: null,
  env: null,
  envError: null,

  detectEnv: async () => {
    try {
      const env = await invoke<NpmEnv>("detect_environment")
      set({ env, envError: null })
    } catch (err) {
      set({ env: null, envError: String(err) })
    }
  },

  openProject: async (path: string) => {
    try {
      const info = await invoke<ProjectInfo>("open_project", { path })
      set({ screen: "workbench", projectInfo: info, mode: "local" })
      await invoke("set_mode", { mode: "local" })
    } catch (err) {
      if (String(err) === "NO_PACKAGE_JSON") {
        set({ screen: "no-package-json" })
        return
      }
      // 其它错误（权限、路径非法等）向上抛出，由调用方展示
      throw err
    }
  },

  enterGlobalMode: async () => {
    set({ screen: "workbench", mode: "global", projectInfo: null })
    await invoke("set_mode", { mode: "global" })
  },

  switchMode: async (mode) => {
    set({ mode })
    await invoke("set_mode", { mode })
  },

  openFolderDialog: async () => {
    const { open } = await import("@tauri-apps/plugin-dialog")
    const selected = await open({ directory: true, multiple: false, title: "选择 npm 项目目录" })
    if (selected) {
      await get().openProject(selected)
    }
  },

  initPackageJson: async () => {
    const { projectInfo, openProject } = get()
    if (!projectInfo) return
    await invoke("npm_init", { path: projectInfo.path })
    openProject(projectInfo.path)
  },
}))
