import { useEffect } from "react"
import { useUIStore } from "../stores/useUIStore"
import { usePackageStore } from "../stores/usePackageStore"

export function useKeyboard() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "r") {
        e.preventDefault()
        usePackageStore.getState().fetchOutdated()
      }
      if (e.ctrlKey && e.key === "i") {
        e.preventDefault()
        useUIStore.getState().openInstallDrawer()
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
