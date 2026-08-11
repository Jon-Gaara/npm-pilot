import { useEffect } from "react"
import { useUIStore } from "../stores/useUIStore"
import { usePackageStore } from "../stores/usePackageStore"
import { useProjectStore } from "../stores/useProjectStore"

export function useKeyboard() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key === "r") {
        e.preventDefault()
        const store = usePackageStore.getState()
        if (useProjectStore.getState().mode === "global") {
          store.fetchGlobalOutdated()
        } else {
          store.fetchOutdated()
        }
      }
      if (mod && e.key === "i") {
        e.preventDefault()
        const { mode, projectInfo } = useProjectStore.getState()
        // 本地模式且未选项目时不允许打开安装抽屉
        if (mode === "global" || (mode === "local" && projectInfo)) {
          useUIStore.getState().openInstallDrawer()
        }
      }
      if (mod && e.key === "k") {
        e.preventDefault()
        const el = document.getElementById("npm-pilot-search") as HTMLInputElement | null
        el?.focus()
        el?.select()
      }
      if (e.key === "Escape") {
        e.preventDefault()
        useUIStore.getState().closeOverlay()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])
}
