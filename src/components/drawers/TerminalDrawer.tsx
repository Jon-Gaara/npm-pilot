import { useRef, useEffect, useCallback } from "react"
import { useTerminalStore } from "../../stores/useTerminalStore"

const LEVEL_STYLES: Record<string, string> = {
  cmd: "text-accent font-medium",
  stdout: "text-text-secondary",
  stderr: "text-danger",
  status: "text-text-tertiary",
}

function LogLine({ line }: { line: { id: number; text: string; level: string; timestamp: number } }) {
  const time = new Date(line.timestamp).toLocaleTimeString("zh-CN", { hour12: false })
  return (
    <div className={`flex gap-2 px-3 py-0.5 font-mono text-xs leading-5 ${LEVEL_STYLES[line.level] || "text-text-secondary"}`}>
      <span className="shrink-0 text-text-quaternary select-none tabular-nums">{time}</span>
      <span className="whitespace-pre-wrap break-all">{line.text}</span>
    </div>
  )
}

export function TerminalDrawer() {
  const lines = useTerminalStore((s) => s.lines)
  const expanded = useTerminalStore((s) => s.expanded)
  const running = useTerminalStore((s) => s.running)
  const autoScroll = useTerminalStore((s) => s.autoScroll)
  const toggleExpanded = useTerminalStore((s) => s.toggleExpanded)
  const setAutoScroll = useTerminalStore((s) => s.setAutoScroll)
  const clear = useTerminalStore((s) => s.clear)
  const blockedScripts = useTerminalStore((s) => s.blockedScripts)
  const allowingPkg = useTerminalStore((s) => s.allowingPkg)
  const allowScript = useTerminalStore((s) => s.allowScript)

  const scrollRef = useRef<HTMLDivElement>(null)
  const userScrolledUp = useRef(false)

  useEffect(() => {
    if (!autoScroll || !scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [lines, autoScroll])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30
    if (!atBottom && !userScrolledUp.current) {
      userScrolledUp.current = true
      setAutoScroll(false)
    } else if (atBottom && userScrolledUp.current) {
      userScrolledUp.current = false
      setAutoScroll(true)
    }
  }, [setAutoScroll])

  const truncated = lines.length > 0 && lines[0].id !== 1

  if (!expanded) {
    return (
      <div
        onClick={toggleExpanded}
        className="h-7 shrink-0 flex items-center px-4 bg-paper-1 border-t border-border-0 cursor-pointer text-xs text-text-tertiary hover:text-text-secondary transition-colors"
      >
        <span>▸ npm output</span>
        <span className="ml-2 w-1.5 h-1.5 rounded-full bg-paper-3" />
        <span className="ml-auto font-mono text-xs text-text-quaternary">{lines.length} 行</span>
      </div>
    )
  }

  return (
    <div className="shrink-0 flex flex-col bg-paper-0 border-t border-border-0" style={{ height: 200 }}>
      {/* Header */}
      <div className="flex items-center px-4 h-7 shrink-0 bg-paper-1 border-b border-border-0">
        <button onClick={toggleExpanded} className="text-xs text-text-tertiary hover:text-text-secondary transition-colors">
          ▾ npm output
        </button>
        <span className={`ml-2 w-1.5 h-1.5 rounded-full ${running ? "bg-accent animate-pulse" : "bg-paper-3"}`} />
        <span className="ml-auto text-xs text-text-quaternary font-mono">{lines.length} 行</span>
        <button onClick={clear} className="ml-2 text-xs text-text-quaternary hover:text-text-secondary transition-colors">清空</button>
      </div>

      {/* Log viewport */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-paper-0"
      >
        {truncated && (
          <div className="px-3 py-1 text-center text-[10px] text-text-quaternary">
            ⚠ 早期日志已被截断
          </div>
        )}
        {lines.map((line) => (
          <LogLine key={line.id} line={line} />
        ))}
      </div>

      {/* Blocked scripts allow bar */}
      {blockedScripts.size > 0 && (
        <div className="shrink-0 px-3 py-2 bg-warn-surface/30 border-t border-warn-border/30">
          <div className="text-[10px] text-warn mb-1.5">
            ⚠ 以下包的安装脚本被 npm 安全策略拦截
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from(blockedScripts).map((pkg) => (
              <div key={pkg} className="flex items-center gap-2 px-2 py-1 rounded-md bg-paper-2 border border-border-0">
                <span className="font-mono text-xs text-text-secondary">{pkg}</span>
                <button
                  onClick={() => allowScript(pkg)}
                  disabled={allowingPkg === pkg}
                  className="px-2 py-0.5 text-[10px] bg-accent-dim hover:bg-accent text-white rounded disabled:opacity-40 transition-colors"
                >
                  {allowingPkg === pkg ? "放行中..." : "允许脚本"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scroll to bottom button */}
      {!autoScroll && (
        <button
          onClick={() => {
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
            setAutoScroll(true)
          }}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-paper-3 px-3 py-0.5 text-[10px] text-text-secondary shadow-lg hover:bg-paper-4 transition-colors"
        >
          ↓ 回到底部
        </button>
      )}
    </div>
  )
}
