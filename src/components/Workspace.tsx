import { useEffect } from "react"
import { Sidebar } from "./layout/Sidebar"
import { TopBar } from "./layout/TopBar"
import { PackageTable } from "./table/PackageTable"
import { TerminalDrawer } from "./drawers/TerminalDrawer"
import { InstallDrawer } from "./drawers/InstallDrawer"
import { ConfirmDialog } from "./dialogs/ConfirmDialog"
import { useUIStore } from "../stores/useUIStore"
import { useProjectStore } from "../stores/useProjectStore"
import { usePackageStore } from "../stores/usePackageStore"

export function Workspace() {
  const activeOverlay = useUIStore((s) => s.activeOverlay)
  const mode = useProjectStore((s) => s.mode)
  const projectInfo = useProjectStore((s) => s.projectInfo)
  const fetchOutdated = usePackageStore((s) => s.fetchOutdated)
  const fetchGlobalList = usePackageStore((s) => s.fetchGlobalList)
  const fetchGlobalOutdated = usePackageStore((s) => s.fetchGlobalOutdated)

  useEffect(() => {
    if (mode === "global") {
      fetchGlobalList()
      fetchGlobalOutdated()
    } else if (projectInfo) {
      fetchOutdated()
    }
  }, [mode, projectInfo])

  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <div className="flex-1 min-h-0 overflow-hidden">
          <PackageTable />
        </div>
        <TerminalDrawer />
      </div>

      {activeOverlay === "install-drawer" && <InstallDrawer />}
      {activeOverlay === "confirm-dialog" && <ConfirmDialog />}
    </div>
  )
}
