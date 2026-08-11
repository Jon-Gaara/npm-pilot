import { create } from "zustand"

const MAX_TOASTS = 5
let toastId = 0
const timers = new Set<ReturnType<typeof setTimeout>>()

interface Toast {
  id: number
  message: string
  type: "success" | "error" | "info"
}

interface ToastState {
  toasts: Toast[]
  push: (message: string, type?: Toast["type"]) => void
  remove: (id: number) => void
  dispose: () => void
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (message, type = "info") => {
    const id = ++toastId
    set((s) => {
      const toasts = [...s.toasts, { id, message, type }]
      // 超过上限时丢弃最旧的
      return { toasts: toasts.length > MAX_TOASTS ? toasts.slice(toasts.length - MAX_TOASTS) : toasts }
    })
    const timer = setTimeout(() => {
      get().remove(id)
      timers.delete(timer)
    }, 3000)
    timers.add(timer)
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  dispose: () => {
    timers.forEach((t) => clearTimeout(t))
    timers.clear()
    set({ toasts: [] })
  },
}))
