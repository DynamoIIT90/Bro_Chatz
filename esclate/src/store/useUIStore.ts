import { create } from 'zustand'

interface UIState {
  isComposerOpen: boolean
  openComposer: () => void
  closeComposer: () => void
}

const useUIStore = create<UIState>((set) => ({
  isComposerOpen: false,
  openComposer: () => set({ isComposerOpen: true }),
  closeComposer: () => set({ isComposerOpen: false }),
}))

export default useUIStore