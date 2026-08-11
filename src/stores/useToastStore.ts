import { create } from "zustand"

interface Toast {
  id: number
  message: string
  type: "success" | "error" | "info"
}

interface ToastState {
  toasts: Toast[]
  push: (message: string, type?: Toast["type"]) => void
  remove: (id: number) => void
}

let toastId = 0

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (message, type = "info") => {
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => {
      get().remove(id)
    }, 3000)
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
