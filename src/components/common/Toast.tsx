import { useToastStore } from "../../stores/useToastStore"

const TYPE_STYLES: Record<string, string> = {
  success: "border-accent-border/50 bg-accent-surface/90 text-accent-bright",
  error: "border-danger-border/50 bg-danger-surface/90 text-danger",
  info: "border-border-1/50 bg-paper-2/90 text-text-secondary",
}

export function Toast() {
  const toasts = useToastStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-12 right-4 z-[60] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-2 rounded-lg border shadow-xl text-sm backdrop-blur ${TYPE_STYLES[t.type]}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
