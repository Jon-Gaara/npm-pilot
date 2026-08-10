interface PackageRowProps {
  name: string
  current: string
  wanted?: string
  latest?: string
  busy: boolean
  hasUpdate: boolean
  onUpgrade: (target: "wanted" | "latest") => void
  onUninstall: () => void
}

export function PackageRow({ name, current, wanted, latest, busy, hasUpdate, onUpgrade, onUninstall }: PackageRowProps) {
  const hasMajor = wanted && latest && isMajor(current, latest)

  return (
    <tr className={`border-b border-border-0/50 hover:bg-paper-2/50 transition-all duration-100 group ${busy ? "opacity-50 pointer-events-none" : ""}`}>
      <td className="px-4 py-3">
        <input type="checkbox" className="accent-accent-dim rounded-sm opacity-30 group-hover:opacity-100 transition-opacity" />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-primary font-medium">{name}</span>
          {hasMajor && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-warn-surface text-warn border border-warn-border/30">
              major
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-xs text-text-tertiary">{current}</span>
      </td>
      <td className="px-4 py-3">
        {busy ? (
          <span className="inline-block w-20 h-4 bg-paper-3 rounded animate-pulse" />
        ) : hasUpdate && wanted ? (
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs text-accent font-medium">{wanted}</span>
            {latest && wanted !== latest && (
              <>
                <span className="text-text-quaternary text-xs">→</span>
                <span className="font-mono text-xs text-warn">{latest}</span>
              </>
            )}
          </div>
        ) : (
          <span className="text-xs text-text-quaternary">最新</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {hasUpdate ? (
            <>
              <button
                onClick={() => onUpgrade("wanted")}
                disabled={busy || current === wanted}
                className="px-2 py-1 text-xs rounded-md bg-accent-surface text-accent hover:bg-accent-surface/80 border border-accent-border/30 disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-100 active:scale-[0.95]"
              >
                {current === wanted ? "✓" : "升级"}
              </button>
              {latest && wanted !== latest && (
                <button
                  onClick={() => onUpgrade("latest")}
                  disabled={busy}
                  className="px-2 py-1 text-xs rounded-md bg-warn-surface text-warn hover:bg-warn-surface/80 border border-warn-border/30 disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-100 active:scale-[0.95]"
                >
                  最新
                </button>
              )}
            </>
          ) : null}
          <button
            onClick={onUninstall}
            disabled={busy}
            className="px-2 py-1 text-xs rounded-md text-danger hover:bg-danger-surface/50 disabled:opacity-25 transition-all duration-100"
          >
            卸载
          </button>
        </div>
      </td>
    </tr>
  )
}

function isMajor(current: string, latest: string): boolean {
  const c = parseInt(current.split(".")[0], 10)
  const l = parseInt(latest.split(".")[0], 10)
  return !isNaN(c) && !isNaN(l) && l > c + 1
}
