import { useState } from "react"
import { useUIStore } from "../../stores/useUIStore"
import { useTerminalStore } from "../../stores/useTerminalStore"
import { usePackageStore } from "../../stores/usePackageStore"
import { useToastStore } from "../../stores/useToastStore"
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
    const v = version.trim()
    if (v && !/^[0-9a-zA-Z.*+\-^~><=\s]+$/.test(v)) {
      setError("版本号包含非法字符")
      return
    }

    setInstalling(true)
    setError(null)

    const terminalStore = useTerminalStore.getState()
    const label = version
      ? `npm install ${name}@${version}`
      : `npm install ${name}`

    // 安装前确认脚本：'proceed'/'skip' 直接装，'allow' 先放行，'cancel' 中止
    const decision = await useUIStore.getState().ensureScriptsConfirmed(name, version)
    if (decision === "cancel") {
      setInstalling(false)
      return
    }
    if (decision === "allow") {
      try {
        await invoke("add_allow_scripts", { pkg: name })
      } catch (err) {
        setError(String(err))
        setInstalling(false)
        return
      }
    }

    terminalStore.startOperation(label)

    try {
      await invoke("npm_install_pkg", {
        pkgName: name,
        version: version || null,
        saveTarget: saveTarget,
        exact: exact,
      })
      // 事件监听器会自动调用 endOperation，这里不重复调用
      usePackageStore.getState().lightRefresh()
      usePackageStore.getState().fetchOutdated()
      useToastStore.getState().push(
        version ? `已安装 ${name}@${version}` : `已安装 ${name}`,
        "success"
      )
      setTimeout(() => closeOverlay(), 1500)
    } catch (err) {
      setError(String(err))
      useToastStore.getState().push(`安装失败: ${String(err)}`, "error")
    } finally {
      setInstalling(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={closeOverlay} />
      <aside className="fixed right-0 top-0 h-full w-[360px] bg-paper-1 border-l border-border-0 z-50 flex flex-col">
        <div className="flex items-center justify-between px-4 h-12 border-b border-border-0">
          <h2 className="text-sm font-medium text-text-primary">安装新包</h2>
          <button onClick={closeOverlay} className="text-text-tertiary hover:text-text-secondary transition-colors">✕</button>
        </div>

        <div className="flex-1 p-4 space-y-4">
          {/* Package name */}
          <div>
            <label className="text-xs text-text-tertiary block mb-1">包名</label>
            <input
              type="text"
              value={pkgName}
              onChange={(e) => setPkgName(e.target.value)}
              placeholder="例如: react, lodash, @types/react"
              disabled={installing}
              autoFocus
              className="w-full bg-paper-2 rounded-md px-3 py-2 text-sm text-text-primary placeholder-text-quaternary border border-border-0 focus:outline-none focus:border-accent-dim/50 focus:bg-paper-3 disabled:opacity-50 transition-colors"
            />
          </div>

          {/* Version */}
          <div>
            <label className="text-xs text-text-tertiary block mb-1">版本（可选，留空为 latest）</label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="latest"
              disabled={installing}
              className="w-full bg-paper-2 rounded-md px-3 py-2 text-sm text-text-primary placeholder-text-quaternary border border-border-0 focus:outline-none focus:border-accent-dim/50 focus:bg-paper-3 disabled:opacity-50 transition-colors"
            />
          </div>

          {/* Save target */}
          <div>
            <label className="text-xs text-text-tertiary block mb-1">保存到</label>
            <div className="flex gap-2">
              {(["dependencies", "devDependencies", "no-save"] as const).map((target) => (
                <button
                  key={target}
                  onClick={() => setSaveTarget(target)}
                  disabled={installing}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                    saveTarget === target
                      ? "border-accent-dim/60 bg-accent-surface text-accent"
                      : "border-border-0 text-text-tertiary hover:border-border-1 hover:text-text-secondary"
                  } disabled:opacity-50`}
                >
                  {target === "dependencies" ? "生产依赖" : target === "devDependencies" ? "开发依赖" : "不保存"}
                </button>
              ))}
            </div>
          </div>

          {/* Exact toggle */}
          <label className="flex items-center gap-2 text-xs text-text-tertiary">
            <input
              type="checkbox"
              checked={exact}
              onChange={(e) => setExact(e.target.checked)}
              disabled={installing}
              className="accent-accent-dim rounded"
            />
            --save-exact（锁定精确版本）
          </label>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-md bg-danger-surface border border-danger-border text-xs text-danger">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-0">
          <button
            onClick={handleInstall}
            disabled={installing || !pkgName.trim()}
            className="w-full py-2 rounded-md bg-accent-dim hover:bg-accent text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.98]"
          >
            {installing ? "安装中..." : "安装"}
          </button>
        </div>
      </aside>
    </>
  )
}
