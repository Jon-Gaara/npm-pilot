import { create } from "zustand"
import { listen } from "@tauri-apps/api/event"
import { invoke } from "@tauri-apps/api/core"
import type { TerminalLine, LogPayload } from "../types"

const MAX_LINES = 2000
let lineId = 0

export function extractBlockedPackage(line: string): string | null {
  // 只匹配真实包行（含 "(postinstall:" 等脚本标记），忽略 summary/suggestion 行
  if (!line.includes("(postinstall:") && !line.includes("(preinstall:") && !line.includes("(install:")) {
    return null
  }
  const marker = "install-scripts"
  const idx = line.indexOf(marker)
  if (idx < 0) return null
  const after = line.slice(idx + marker.length).trim()
  const spec = after.split(" (")[0]
  const vidx = spec.lastIndexOf("@")
  if (vidx < 0) return null
  const name = spec.slice(0, vidx)
  return name || null
}

interface TerminalState {
  lines: TerminalLine[]
  running: boolean
  expanded: boolean
  autoScroll: boolean
  currentOpId: string | null
  blockedScripts: Set<string>
  allowingPkg: string | null

  startOperation: (label: string) => string
  push: (level: TerminalLine["level"], text: string) => void
  pushCmd: (text: string) => void
  pushInfo: (text: string) => void
  pushError: (text: string) => void
  endOperation: (success: boolean) => void
  toggleExpanded: () => void
  setAutoScroll: (v: boolean) => void
  clear: () => void
  allowScript: (pkg: string) => Promise<void>
  removeBlockedScript: (pkg: string) => void
  startListening: () => Promise<() => void>
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  lines: [],
  running: false,
  expanded: false,
  autoScroll: true,
  currentOpId: null,
  blockedScripts: new Set(),
  allowingPkg: null,

  startOperation: (label) => {
    const opId = `op-${Date.now()}`
    set((s) => ({
      currentOpId: opId,
      running: true,
      expanded: true,
      lines: [
        ...s.lines,
        { id: ++lineId, text: label, level: "cmd", timestamp: Date.now() },
      ],
    }))
    return opId
  },

  push: (level, text) => {
    const blocked = extractBlockedPackage(text)
    set((s) => {
      const newLine: TerminalLine = {
        id: ++lineId,
        text,
        level,
        timestamp: Date.now(),
      }
      let lines: TerminalLine[]
      if (s.lines.length >= MAX_LINES) {
        const cutPoint = Math.floor(MAX_LINES * 0.25)
        lines = [...s.lines.slice(cutPoint), newLine]
      } else {
        lines = [...s.lines, newLine]
      }
      const next: Partial<TerminalState> = { lines }
      if (blocked) {
        const blockedScripts = new Set(s.blockedScripts)
        blockedScripts.add(blocked)
        next.blockedScripts = blockedScripts
      }
      return next
    })
  },

  pushCmd: (text) => {
    const store = get()
    store.push("cmd", text)
  },

  pushInfo: (text) => {
    const store = get()
    store.push("stdout", text)
  },

  pushError: (text) => {
    const store = get()
    store.push("stderr", text)
  },

  endOperation: (success) =>
    set((s) => ({
      running: false,
      currentOpId: null,
      lines: [
        ...s.lines,
        {
          id: ++lineId,
          text: success ? "✓ 完成" : "✗ 失败",
          level: "status",
          timestamp: Date.now(),
        },
      ],
    })),

  toggleExpanded: () => set((s) => ({ expanded: !s.expanded })),

  setAutoScroll: (autoScroll) => set({ autoScroll }),

  clear: () => set({ lines: [], running: false, blockedScripts: new Set(), allowingPkg: null }),

  allowScript: async (pkg) => {
    set({ allowingPkg: pkg })
    try {
      await invoke("add_allow_scripts", { pkg })
      const blockedScripts = new Set(get().blockedScripts)
      blockedScripts.delete(pkg)
      set({ blockedScripts, allowingPkg: null })
      get().pushInfo(`✓ 已放行 ${pkg} 的安装脚本，请重新安装`)
    } catch (err) {
      get().pushError(`放行失败: ${String(err)}`)
      set({ allowingPkg: null })
    }
  },

  removeBlockedScript: (pkg) =>
    set((s) => {
      const blockedScripts = new Set(s.blockedScripts)
      blockedScripts.delete(pkg)
      return { blockedScripts }
    }),

  startListening: async () => {
    const unlisten = await listen<LogPayload>("npm-log", (event) => {
      const { stream, text } = event.payload
      const store = get()

      if (stream === "status") {
        if (text === "exit:0") store.endOperation(true)
        else store.endOperation(false)
        return
      }

      store.push(stream, text)
    })
    return unlisten
  },
}))
