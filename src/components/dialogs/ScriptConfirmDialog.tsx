import { useUIStore, type ScriptChoice } from "../../stores/useUIStore"

export function ScriptConfirmDialog() {
  const scriptConfirm = useUIStore((s) => s.scriptConfirm)
  const resolveScriptConfirm = useUIStore((s) => s.resolveScriptConfirm)

  if (!scriptConfirm) return null

  const choose = (choice: ScriptChoice) => resolveScriptConfirm(choice)

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={() => choose("skip")} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[400px]">
        <div className="bg-paper-1 border border-border-1 rounded-xl p-4 shadow-2xl">
          <h3 className="text-sm font-medium text-text-primary mb-2">安装脚本</h3>
          <p className="text-xs text-text-secondary leading-5 mb-1">
            包 <span className="font-mono text-text-primary">{scriptConfirm.pkg}</span>
            {scriptConfirm.version && <span className="font-mono text-text-tertiary">@{scriptConfirm.version}</span>}{" "}
            包含安装脚本，但未在你的允许列表中。
          </p>
          <p className="text-xs text-warn mb-4">npm 默认会跳过这些脚本。</p>

          <div className="space-y-2">
            <button
              onClick={() => choose("allow")}
              className="w-full px-3 py-2 text-xs font-medium bg-accent-dim hover:bg-accent text-white rounded-lg transition-colors"
            >
              允许脚本并安装
            </button>
            <button
              onClick={() => choose("skip")}
              className="w-full px-3 py-2 text-xs bg-paper-3 hover:bg-paper-4 text-text-secondary hover:text-text-primary border border-border-0 rounded-lg transition-colors"
            >
              不执行脚本，继续安装
            </button>
            <button
              onClick={() => choose("cancel")}
              className="w-full px-3 py-2 text-xs text-danger hover:bg-danger-surface/40 rounded-lg transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
