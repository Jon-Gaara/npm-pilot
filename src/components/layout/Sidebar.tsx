import { useProjectStore } from "../../stores/useProjectStore"
import { usePackageStore } from "../../stores/usePackageStore"

export function Sidebar() {
  const mode = useProjectStore((s) => s.mode)
  const switchMode = useProjectStore((s) => s.switchMode)
  const projectInfo = useProjectStore((s) => s.projectInfo)
  const openFolderDialog = useProjectStore((s) => s.openFolderDialog)
  const filters = usePackageStore((s) => s.filters)
  const toggleFilter = usePackageStore((s) => s.toggleFilter)

  return (
    <aside className="w-[220px] shrink-0 flex flex-col border-r border-border-0 bg-paper-1">
      {/* Mode Switcher */}
      <div className="flex mx-3 mt-3 mb-5 bg-paper-2 rounded-lg p-0.5 border border-border-0">
        <button
          onClick={() => switchMode("local")}
          className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all duration-150 ${
            mode === "local"
              ? "bg-paper-3 text-text-primary shadow-sm"
              : "text-text-tertiary hover:text-text-secondary"
          }`}
        >
          本地项目
        </button>
        <button
          onClick={() => switchMode("global")}
          className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all duration-150 ${
            mode === "global"
              ? "bg-paper-3 text-text-primary shadow-sm"
              : "text-text-tertiary hover:text-text-secondary"
          }`}
        >
          全局环境
        </button>
      </div>

      {/* Local mode */}
      {mode === "local" && (
        <>
          <div className="px-3 mb-4">
            <div className="text-[10px] uppercase tracking-wider text-text-quaternary mb-3 font-medium">筛选</div>
            <label className="flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer mb-2 group">
              <input
                type="checkbox"
                checked={filters.outdatedOnly}
                onChange={() => toggleFilter("outdatedOnly")}
                className="accent-accent-dim rounded"
              />
              有过时版本
            </label>
            <label className="flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.majorOnly}
                onChange={() => toggleFilter("majorOnly")}
                className="accent-accent-dim rounded"
              />
              有 major 升级
            </label>
          </div>

          {projectInfo ? (
            <div className="mt-auto mx-3 mb-3 p-3 rounded-xl bg-paper-2 border border-border-0">
              <div className="text-sm font-medium text-text-primary truncate">{projectInfo.name}</div>
              <div className="text-xs text-text-tertiary mt-0.5">v{projectInfo.version}</div>
              <div className="text-xs text-text-tertiary">{projectInfo.dep_count + projectInfo.dev_dep_count} 个依赖</div>
              <div className="text-xs text-text-quaternary truncate mt-1 font-mono">{projectInfo.path.slice(0, 30)}...</div>
              <button
                onClick={openFolderDialog}
                className="mt-2 text-xs text-accent hover:text-accent-bright transition-colors"
              >
                更换目录
              </button>
            </div>
          ) : (
            <div className="mt-auto mx-3 mb-3">
              <button
                onClick={openFolderDialog}
                className="w-full px-4 py-2.5 text-sm bg-accent-dim hover:bg-accent rounded-lg text-white font-medium transition-all duration-150 active:scale-[0.98]"
              >
                📂 选择项目文件夹
              </button>
              <p className="text-xs text-text-quaternary mt-2 text-center">
                选择一个包含 package.json 的目录
              </p>
            </div>
          )}
        </>
      )}

      {/* Global mode */}
      {mode === "global" && (
        <>
          <div className="px-3 mb-4">
            <div className="text-[10px] uppercase tracking-wider text-text-quaternary mb-3 font-medium">筛选</div>
            <label className="flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.showOutdatedOnly}
                onChange={() => toggleFilter("showOutdatedOnly")}
                className="accent-accent-dim rounded"
              />
              有更新版本
            </label>
          </div>

          <div className="mt-auto mx-3 mb-3 p-3 rounded-xl bg-paper-2 border border-border-0">
            <div className="text-xs text-text-tertiary font-medium">全局包</div>
            <div className="text-xs text-text-quaternary mt-1">操作全局安装的 npm 包</div>
          </div>
        </>
      )}
    </aside>
  )
}
