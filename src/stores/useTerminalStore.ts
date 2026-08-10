import { create } from "zustand"
import { listen } from "@tauri-apps/api/event"
import type { TerminalLine, LogPayload } from "../types"

const MAX_LINES = 2000
let lineId = 0

interface TerminalState {
  lines: TerminalLine[]
  running: boolean
  expanded: boolean
  autoScroll: boolean
  currentOpId: string | null

  startOperation: (label: string) => string
  push: (level: TerminalLine["level"], text: string) => void
  pushCmd: (text: string) => void
  pushInfo: (text: string) => void
  pushError: (text: string) => void
  endOperation: (success: boolean) => void
  toggleExpanded: () => void
  setAutoScroll: (v: boolean) => void
  clear: () => void
  startListening: () => Promise<() => void>
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  lines: [],
  running: false,
  expanded: false,
  autoScroll: true,
  currentOpId: null,

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

  push: (level, text) =>
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
      return { lines }
    }),

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

  clear: () => set({ lines: [], running: false }),

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
