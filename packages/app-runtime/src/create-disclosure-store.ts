import { createStore } from "zustand/vanilla";

export interface DisclosureState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export function createDisclosureStore(initiallyOpen = false) {
  return createStore<DisclosureState>()((set) => ({
    isOpen: initiallyOpen,
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
    toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  }));
}
