import { create } from 'zustand'

export type ToastTone = 'default' | 'success' | 'error'
export interface Toast { id: number; message: string; tone: ToastTone }

interface ToastState {
  toasts: Toast[]
  show: (message: string, tone?: ToastTone) => void
  dismiss: (id: number) => void
}

let seq = 0
export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show: (message, tone = 'default') => {
    const id = ++seq
    set({ toasts: [...get().toasts.slice(-2), { id, message, tone }] })
    setTimeout(() => get().dismiss(id), 3200)
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))

export const toast = {
  show: (m: string) => useToastStore.getState().show(m),
  success: (m: string) => useToastStore.getState().show(m, 'success'),
  error: (m: string) => useToastStore.getState().show(m, 'error'),
}
