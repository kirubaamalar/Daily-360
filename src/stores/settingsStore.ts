import { create } from 'zustand'
import { DEFAULT_SETTINGS, type AppSettings } from '@/types/models'
import { loadSettings, saveSettings } from '@/services/settingsService'

interface SettingsState {
  settings: AppSettings
  ready: boolean
  error?: string
  init: () => Promise<void>
  update: (patch: Partial<Omit<AppSettings, 'id'>>) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  ready: false,
  init: async () => {
    try {
      set({ settings: await loadSettings(), ready: true, error: undefined })
    } catch (e) {
      set({ ready: true, error: e instanceof Error ? e.message : 'Local storage is unavailable.' })
    }
  },
  update: async (patch) => {
    set({ settings: await saveSettings(patch) })
  },
}))
