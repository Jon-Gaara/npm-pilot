import { useUIStore } from "../../stores/useUIStore"

export function ConfirmDialog() {
  const confirmPayload = useUIStore((s) => s.confirmPayload)
  const closeOverlay = useUIStore((s) => s.closeOverlay)
  const resolveConfirm = useUIStore((s) => s.resolveConfirm)

  if (!confirmPayload || confirmPayload.type !== "uninstall") return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={closeOverlay} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-80">
        <div className="bg-paper-1 border border-border-1 rounded-xl p-4 shadow-2xl">
          <h3 className="text-sm font-medium text-text-primary mb-2">确认卸载</h3>
          <p className="text-xs text-text-secondary mb-4">
            确定要卸载 <span className="text-text-primary font-mono">{confirmPayload.pkgName}</span> 吗？
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={closeOverlay}
              className="px-3 py-1.5 text-xs text-text-tertiary hover:text-text-secondary border border-border-0 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={resolveConfirm}
              className="px-3 py-1.5 text-xs bg-danger-dim hover:bg-danger text-white rounded-lg transition-colors active:scale-[0.97]"
            >
              确认卸载
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
