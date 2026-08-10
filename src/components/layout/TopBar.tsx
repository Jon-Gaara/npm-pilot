import { useProjectStore } from "../../stores/useProjectStore"
import { usePackageStore } from "../../stores/usePackageStore"
import { useUIStore } from "../../stores/useUIStore"

export function TopBar() {
  const env = useProjectStore((s) => s.env)
  const mode = useProjectStore((s) => s.mode)
  const query = usePackageStore((s) => s.query)
  const setQuery = usePackageStore((s) => s.setQuery)
  const refreshing = usePackageStore((s) => s.status === "loading")
  const fetchOutdated = usePackageStore((s) => s.fetchOutdated)
  const fetchGlobalOutdated = usePackageStore((s) => s.fetchGlobalOutdated)
  const openInstallDrawer = useUIStore((s) => s.openInstallDrawer)

  const handleRefresh = () => {
    if (mode === "global") {
      fetchGlobalOutdated()
    } else {
      fetchOutdated()
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 h-11 border-b border-border-0 bg-paper-1 shrink-0">
      {/* Search */}
      <div className="flex-1 max-w-xs relative group">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索包名..."
          className="w-full bg-paper-2 rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder-text-quaternary border border-border-0 focus:outline-none focus:border-accent-dim/50 focus:bg-paper-3 transition-all duration-150"
        />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-text-quaternary bg-paper-3 px-1.5 rounded border border-border-0 hidden group-focus-within:hidden md:inline">⌘K</kbd>
      </div>

      {/* Env heartbeat */}
      {env && (
        <div className="flex items-center gap-3 text-xs text-text-tertiary">
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${env.node_version ? "bg-accent" : "bg-danger"}`} />
            Node v{env.node_version || "N/A"}
          </span>
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${env.npm_version ? "bg-accent" : "bg-danger"}`} />
            npm v{env.npm_version || "N/A"}
          </span>
        </div>
      )}

      {/* Refresh button */}
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className="px-3 py-1.5 text-xs text-text-tertiary hover:text-text-secondary border border-border-0 rounded-lg hover:bg-paper-2 disabled:opacity-40 transition-all duration-150"
      >
        {refreshing ? "↻ 刷新中..." : "↻ 检查更新"}
      </button>

      {/* Install button */}
      <button
        onClick={openInstallDrawer}
        className="px-3 py-1.5 text-xs font-medium bg-accent-dim hover:bg-accent text-white rounded-lg transition-all duration-150 active:scale-[0.98]"
      >
        + 安装新包
      </button>
    </div>
  )
}
