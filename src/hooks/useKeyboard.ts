import { useEffect } from "react"
import { useUIStore } from "../stores/useUIStore"
import { usePackageStore } from "../stores/usePackageStore"

export function useKeyboard() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key === "r") {
        e.preventDefault()
        usePackageStore.getState().fetchOutdated()
      }
      if (mod && e.key === "i") {
        e.preventDefault()
        useUIStore.getState().openInstallDrawer()
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
