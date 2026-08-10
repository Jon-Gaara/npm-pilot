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
        <div className="bg-surface-1 border border-zinc-700 rounded-lg p-4 shadow-xl">
          <h3 className="text-sm font-medium text-zinc-200 mb-2">确认卸载</h3>
          <p className="text-xs text-zinc-400 mb-4">
            确定要卸载 <span className="text-zinc-200 font-mono">{confirmPayload.pkgName}</span> 吗？
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={closeOverlay}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded-md"
            >
              取消
            </button>
            <button
              onClick={resolveConfirm}
              className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-md hover:bg-red-500"
            >
              确认卸载
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
