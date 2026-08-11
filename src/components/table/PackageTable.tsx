import { useMemo } from "react"
import { usePackageStore } from "../../stores/usePackageStore"
import { useProjectStore } from "../../stores/useProjectStore"
import { useSelectionStore } from "../../stores/useSelectionStore"
import { PackageRow } from "./PackageRow"
import type { PackageEntry } from "../../types"

export function PackageTable() {
  const mode = useProjectStore((s) => s.mode)
  const outdated = usePackageStore((s) => s.outdated)
  const installed = usePackageStore((s) => s.installed)
  const status = usePackageStore((s) => s.status)
  const error = usePackageStore((s) => s.error)
  const query = usePackageStore((s) => s.query)
  const busyRows = usePackageStore((s) => s.busyRows)
  const fetchOutdated = usePackageStore((s) => s.fetchOutdated)
  const fetchGlobalList = usePackageStore((s) => s.fetchGlobalList)
  const upgradeOne = usePackageStore((s) => s.upgradeOne)
  const uninstallOne = usePackageStore((s) => s.uninstallOne)

  const projectInfo = useProjectStore((s) => s.projectInfo)
  const filters = usePackageStore((s) => s.filters)

  const selected = useSelectionStore((s) => s.selected)
  const toggle = useSelectionStore((s) => s.toggle)
  const clearAll = useSelectionStore((s) => s.clearAll)
  const selectAll = useSelectionStore((s) => s.selectAll)

  const entries = useMemo(() => {
    // 优先从 installed 出发（展示全部已安装依赖），合并 outdated 信息；
    // 若 installed 为空（如 npm_ls 失败），回退用 outdated 的 key 兜底
    const base: Record<string, string> =
      Object.keys(installed).length > 0
        ? installed
        : Object.fromEntries(Object.keys(outdated).map((k) => [k, outdated[k]?.current ?? ""]))

    let list: PackageEntry[] = Object.entries(base).map(([name, current]) => {
      const updateInfo = outdated[name]
      return {
        name,
        current,
        wanted: updateInfo?.wanted,
        latest: updateInfo?.latest,
        dep_type: mode === "global" ? "global" : (updateInfo?.dep_type ?? "dependencies"),
        hasUpdate: mode === "global" ? !!updateInfo : (updateInfo ? updateInfo.current !== updateInfo.wanted : false),
      }
    })

    if (mode === "global") {
      if (filters.showOutdatedOnly) {
        list = list.filter((pkg) => pkg.hasUpdate)
      }
    } else {
      if (filters.outdatedOnly) {
        list = list.filter((pkg) => pkg.hasUpdate)
      }
      if (filters.majorOnly) {
        list = list.filter((pkg) => {
          const c = parseInt(pkg.current.split(".")[0], 10)
          const target = pkg.latest || pkg.wanted || pkg.current
          const l = parseInt(target.split(".")[0], 10)
          return !isNaN(c) && !isNaN(l) && l > c + 1
        })
      }
    }

    // 搜索过滤
    if (query) {
      list = list.filter((pkg) => pkg.name.toLowerCase().includes(query.toLowerCase()))
    }

    return list
  }, [mode, outdated, installed, query, filters])

  // No project selected (local mode)
  if (mode === "local" && !projectInfo) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-text-tertiary">
        <p className="text-text-secondary text-lg">📂 未选择项目</p>
        <p className="text-xs text-text-quaternary">请在左侧边栏选择一个包含 package.json 的目录</p>
      </div>
    )
  }

  // Loading skeleton (首次 idle 也先显示骨架，避免闪空态)
  if ((status === "loading" || status === "idle") && entries.length === 0) {
    return (
      <div className="p-4 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 bg-paper-2 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  // Error state
  if (status === "error" && entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-text-tertiary">
        <p className="text-sm">加载失败</p>
        <p className="text-xs text-danger">{error}</p>
        <button
          onClick={mode === "local" ? fetchOutdated : fetchGlobalList}
          className="px-4 py-2 text-xs bg-paper-2 rounded-lg hover:bg-paper-3 text-text-secondary transition-colors"
        >
          重试
        </button>
      </div>
    )
  }

  // Empty state
  if (entries.length === 0) {
    let title: string
    let hint: string

    if (query) {
      title = "没有匹配的包"
      hint = `未找到包含 "${query}" 的包`
    } else if (mode === "global" && filters.showOutdatedOnly) {
      title = "🎉 所有全局包都是最新的"
      hint = "没有需要更新的全局包"
    } else if (mode === "global") {
      title = "📦 没有安装全局包"
      hint = "运行 npm install -g <pkg> 安装全局包"
    } else if (filters.outdatedOnly || filters.majorOnly) {
      title = "没有符合条件的包"
      hint = "所有已安装的依赖都满足当前筛选条件"
    } else {
      title = "📦 没有已安装的依赖"
      hint = "这个项目还没有安装任何依赖"
    }

    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-text-tertiary">
        <p className="text-sm text-text-secondary">{title}</p>
        <p className="text-xs text-text-quaternary">{hint}</p>
      </div>
    )
  }

  const handleBulkUpgrade = () => {
    const targets = Array.from(selected)
    clearAll()
    targets.forEach((name) => upgradeOne(name, "wanted"))
  }

  const handleBulkUninstall = () => {
    const targets = Array.from(selected)
    clearAll()
    targets.forEach((name) => uninstallOne(name))
  }

  const visibleNames = entries.map((e) => e.name)
  const allVisibleSelected = visibleNames.length > 0 && visibleNames.every((n) => selected.has(n))
  const someSelected = visibleNames.some((n) => selected.has(n))

  const handleToggleAll = () => {
    if (allVisibleSelected) {
      clearAll()
    } else {
      selectAll(visibleNames)
    }
  }

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-paper-1 z-10">
            <tr className="text-xs text-text-tertiary border-b border-border-0">
              <th className="text-left px-4 py-2 font-medium w-8">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected && !allVisibleSelected }}
                  onChange={handleToggleAll}
                  aria-label="全选"
                  className="accent-accent-dim rounded-sm cursor-pointer"
                />
              </th>
              <th className="text-left px-4 py-2 font-medium">包名</th>
              <th className="text-left px-4 py-2 font-medium w-28">已安装</th>
              <th className="text-left px-4 py-2 font-medium w-28">可升级到</th>
              <th className="text-left px-4 py-2 font-medium w-20">操作</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <PackageRow
                key={entry.name}
                name={entry.name}
                current={entry.current}
                wanted={entry.wanted}
                latest={entry.latest}
                busy={busyRows.has(entry.name)}
                hasUpdate={entry.hasUpdate}
                selected={selected.has(entry.name)}
                onToggle={() => toggle(entry.name)}
                onUpgrade={(target) => upgradeOne(entry.name, target)}
                onUninstall={() => uninstallOne(entry.name)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="shrink-0 mx-3 mb-3 px-3 py-2 rounded-lg bg-paper-2 border border-border-0 flex items-center gap-3">
          <span className="text-xs text-text-secondary">已选 {selected.size} 个</span>
          <div className="flex-1" />
          <button
            onClick={handleBulkUninstall}
            className="px-3 py-1.5 text-xs font-medium bg-danger-surface text-danger hover:bg-danger-dim hover:text-white border border-danger-border/40 rounded-lg transition-colors active:scale-[0.97]"
          >
            卸载所选
          </button>
          <button
            onClick={handleBulkUpgrade}
            className="px-3 py-1.5 text-xs font-medium bg-accent-dim hover:bg-accent text-white rounded-lg transition-colors active:scale-[0.97]"
          >
            升级所选
          </button>
          <button
            onClick={clearAll}
            className="px-2 py-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            清除
          </button>
        </div>
      )}
    </div>
  )
}
