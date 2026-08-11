import { useState } from "react"
import { useProjectStore } from "../stores/useProjectStore"
import type { NpmEnv } from "../types"

function EnvStatusCard({ env, onRecheck }: { env: NpmEnv; onRecheck: () => void }) {
  const nodeOk = env.node_version.length > 0
  const npmOk = env.npm_version.length > 0

  const rows = [
    { label: "Node.js", value: nodeOk ? `v${env.node_version}` : "未检测到", ok: nodeOk },
    { label: "npm", value: npmOk ? `v${env.npm_version}` : "未检测到", ok: npmOk },
    { label: "来源", value: env.npm_source || "──", ok: true },
    { label: "版本管理", value: env.version_manager || "未检测到", ok: true },
  ]

  return (
    <div className="w-96 rounded-xl border border-border-0 bg-paper-2 p-4 transition-colors hover:border-border-1/50">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-text-secondary">环境状态</span>
        <button onClick={onRecheck} className="text-xs text-text-tertiary hover:text-text-secondary transition-colors">重新检测</button>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-xs text-text-tertiary">{row.label}</span>
            <span className={`font-mono text-xs ${row.ok ? "text-text-secondary" : "text-danger"}`}>
              {row.value}
              <span className={`ml-1.5 inline-block w-1.5 h-1.5 rounded-full ${row.ok ? "bg-accent" : "bg-danger"}`} />
            </span>
          </div>
        ))}
      </div>
      {!nodeOk && (
        <div className="mt-4 pt-3 border-t border-border-0 text-xs text-text-tertiary space-y-2">
          <p>npm pilot 需要 Node.js 才能工作。</p>
          <p>
            推荐：<a href="https://nodejs.org" className="text-accent hover:text-accent-bright transition-colors">nodejs.org 下载 LTS</a>
          </p>
        </div>
      )}
    </div>
  )
}

export function WelcomeScreen() {
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const env = useProjectStore((s) => s.env)
  const envError = useProjectStore((s) => s.envError)
  const screen = useProjectStore((s) => s.screen)
  const openFolderDialog = useProjectStore((s) => s.openFolderDialog)
  const detectEnv = useProjectStore((s) => s.detectEnv)
  const enterGlobalMode = useProjectStore((s) => s.enterGlobalMode)
  const initPackageJson = useProjectStore((s) => s.initPackageJson)

  const nodeOk = !!env?.node_version
  const isNoPackageJson = screen === "no-package-json"

  const handleOpenProject = async () => {
    setOpening(true)
    setError(null)
    try {
      await openFolderDialog()
    } catch (err) {
      setError(String(err))
    } finally {
      setOpening(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 select-none">
      {/* Logo area */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-accent-surface flex items-center justify-center text-3xl shadow-lg shadow-accent-surface/30">
          📦
        </div>
        <h1 className="text-2xl font-semibold text-text-primary tracking-tight">npm pilot</h1>
        <p className="text-sm text-text-tertiary">你的 npm 依赖管理驾驶舱</p>
      </div>

      {/* 无 package.json 引导 */}
      {isNoPackageJson && (
        <div className="px-4 py-2 rounded-lg bg-warn-surface border border-warn-border/40 text-xs text-warn text-center">
          当前目录没有 package.json
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        {isNoPackageJson ? (
          <>
            <button
              onClick={initPackageJson}
              className="px-5 py-2.5 bg-accent-dim hover:bg-accent rounded-lg text-white text-sm font-medium transition-all duration-150 active:scale-[0.98]"
            >
              📦 初始化 package.json
            </button>
            <button
              onClick={handleOpenProject}
              disabled={opening}
              className="px-5 py-2.5 bg-paper-3 hover:bg-paper-4 rounded-lg text-text-secondary hover:text-text-primary text-sm font-medium transition-all duration-150 border border-border-0 hover:border-border-1 active:scale-[0.98]"
            >
              {opening ? "正在打开..." : "重新选择目录"}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleOpenProject}
              disabled={!nodeOk || opening}
              className="px-5 py-2.5 bg-accent-dim hover:bg-accent rounded-lg text-white text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 hover:shadow-lg hover:shadow-accent-surface/30 active:scale-[0.98]"
            >
              {opening ? "正在打开..." : "📂 打开项目文件夹"}
            </button>
            <button
              onClick={enterGlobalMode}
              disabled={!nodeOk}
              className="px-5 py-2.5 bg-paper-3 hover:bg-paper-4 rounded-lg text-text-secondary hover:text-text-primary text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 border border-border-0 hover:border-border-1 active:scale-[0.98]"
            >
              🌐 管理全局包
            </button>
          </>
        )}
      </div>

      {!isNoPackageJson && <p className="text-xs text-text-quaternary">拖拽 package.json 到窗口也可打开</p>}

      {error && (
        <div className="px-4 py-2 rounded-lg bg-danger-surface border border-danger-border text-xs text-danger">
          {error}
        </div>
      )}

      {envError && (
        <div className="px-4 py-2 rounded-lg bg-danger-surface border border-danger-border text-xs text-danger text-center max-w-md">
          <p className="font-medium mb-1">环境检测失败</p>
          <p className="break-all">{envError}</p>
          <button
            onClick={detectEnv}
            className="mt-2 px-3 py-1 rounded-md bg-danger text-white hover:bg-danger-dim transition-colors"
          >
            重新检测
          </button>
        </div>
      )}

      {env && !envError && <EnvStatusCard env={env} onRecheck={detectEnv} />}
    </div>
  )
}
