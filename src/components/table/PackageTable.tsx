import { useMemo } from "react"
import { usePackageStore } from "../../stores/usePackageStore"
import { useProjectStore } from "../../stores/useProjectStore"
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

  const entries = useMemo(() => {
    let list: PackageEntry[]

    if (mode === "global") {
      // 全局模式：从 installed 出发，合并 outdated 信息
      list = Object.entries(installed).map(([name, current]) => {
        const updateInfo = outdated[name]
        return {
          name,
          current,
          wanted: updateInfo?.wanted,
          latest: updateInfo?.latest,
          dep_type: "global",
          hasUpdate: !!updateInfo,
        }
      })

      // 筛选：勾选"有更新版本"时只显示有更新的
      if (filters.showOutdatedOnly) {
        list = list.filter((pkg) => pkg.hasUpdate)
      }
    } else {
      // 本地模式：从 outdated 出发
      list = Object.entries(outdated).map(([name, info]) => ({
        name,
        current: info.current,
        wanted: info.wanted,
        latest: info.latest,
        dep_type: info.dep_type,
        hasUpdate: info.current !== info.wanted,
      }))

      if (filters.outdatedOnly) {
        list = list.filter((pkg) => pkg.current !== pkg.wanted)
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

  // Loading skeleton
  if (status === "loading" && entries.length === 0) {
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
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-text-tertiary">
        <p className="text-sm text-text-secondary">{mode === "global" ? "📦 没有安装全局包" : "🎉 所有包都是最新的"}</p>
        <p className="text-xs text-text-quaternary">
          {mode === "global" && filters.showOutdatedOnly
            ? "所有全局包都是最新的"
            : mode === "global"
              ? "运行 npm install -g <pkg> 安装全局包"
              : "没有过时的依赖需要更新"}
        </p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-surface-0 z-10">
          <tr className="text-xs text-text-tertiary border-b border-border-0">
            <th className="text-left px-4 py-2 font-medium w-8"></th>
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
              onUpgrade={(target) => upgradeOne(entry.name, target)}
              onUninstall={() => uninstallOne(entry.name)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
