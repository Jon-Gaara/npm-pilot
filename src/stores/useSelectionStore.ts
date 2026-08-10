import { create } from "zustand"

interface SelectionState {
  selected: Set<string>
  toggle: (name: string) => void
  selectAll: (names: string[]) => void
  clearAll: () => void
  isSelected: (name: string) => boolean
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selected: new Set(),

  toggle: (name) =>
    set((s) => {
      const next = new Set(s.selected)
      next.has(name) ? next.delete(name) : next.add(name)
      return { selected: next }
    }),

  selectAll: (names) => set({ selected: new Set(names) }),

  clearAll: () => set({ selected: new Set() }),

  isSelected: (name) => get().selected.has(name),
}))
