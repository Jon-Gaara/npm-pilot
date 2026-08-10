import { useState } from "react"
import { useUIStore } from "../../stores/useUIStore"
import { useTerminalStore } from "../../stores/useTerminalStore"
import { usePackageStore } from "../../stores/usePackageStore"
import { invoke } from "@tauri-apps/api/core"

export function InstallDrawer() {
  const closeOverlay = useUIStore((s) => s.closeOverlay)
  const [pkgName, setPkgName] = useState("")
  const [version, setVersion] = useState("")
  const [saveTarget, setSaveTarget] = useState<"dependencies" | "devDependencies" | "no-save">("dependencies")
  const [exact, setExact] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInstall = async () => {
    const name = pkgName.trim()
    if (!name) {
      setError("请输入包名")
      return
    }
    if (!/^[a-z0-9@][a-z0-9-._~@/]*$/.test(name)) {
      setError("包名包含非法字符")
      return
    }

    setInstalling(true)
    setError(null)

    const terminalStore = useTerminalStore.getState()
    const label = version
      ? `npm install ${name}@${version}`
      : `npm install ${name}`
    terminalStore.startOperation(label)

    try {
      await invoke("npm_install_pkg", {
        pkgName: name,
        version: version || null,
        saveTarget: saveTarget,
        exact: exact,
      })
      terminalStore.endOperation(true)
      usePackageStore.getState().lightRefresh()
      usePackageStore.getState().fetchOutdated()
      setTimeout(() => closeOverlay(), 1500)
    } catch (err) {
      setError(String(err))
      terminalStore.endOperation(false)
    } finally {
      setInstalling(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={closeOverlay} />
      <aside className="fixed right-0 top-0 h-full w-[360px] bg-surface-1 border-l border-zinc-800 z-50 flex flex-col">
        <div className="flex items-center justify-between px-4 h-12 border-b border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-200">安装新包</h2>
          <button onClick={closeOverlay} className="text-zinc-500 hover:text-zinc-300">✕</button>
        </div>

        <div className="flex-1 p-4 space-y-4">
          {/* Package name */}
          <div>
            <label className="text-xs text-zinc-400 block mb-1">包名</label>
            <input
              type="text"
              value={pkgName}
              onChange={(e) => setPkgName(e.target.value)}
              placeholder="例如: react, lodash, @types/react"
              disabled={installing}
              autoFocus
              className="w-full bg-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 border border-zinc-700 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
            />
          </div>

          {/* Version */}
          <div>
            <label className="text-xs text-zinc-400 block mb-1">版本（可选，留空为 latest）</label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="latest"
              disabled={installing}
              className="w-full bg-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 border border-zinc-700 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
            />
          </div>

          {/* Save target */}
          <div>
            <label className="text-xs text-zinc-400 block mb-1">保存到</label>
            <div className="flex gap-2">
              {(["dependencies", "devDependencies", "no-save"] as const).map((target) => (
                <button
                  key={target}
                  onClick={() => setSaveTarget(target)}
                  disabled={installing}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                    saveTarget === target
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                  } disabled:opacity-50`}
                >
                  {target === "dependencies" ? "dependencies" : target === "devDependencies" ? "devDependencies" : "不保存"}
                </button>
              ))}
            </div>
          </div>

          {/* Exact toggle */}
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={exact}
              onChange={(e) => setExact(e.target.checked)}
              disabled={installing}
              className="accent-emerald-500"
            />
            --save-exact（锁定精确版本）
          </label>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-md bg-red-500/10 border border-red-500/30 text-xs text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={handleInstall}
            disabled={installing || !pkgName.trim()}
            className="w-full py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {installing ? "安装中..." : "安装"}
          </button>
        </div>
      </aside>
    </>
  )
}
