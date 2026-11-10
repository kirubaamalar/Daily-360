import { db } from '@/database/db'
import { DEFAULT_SETTINGS, type AppSettings } from '@/types/models'

export async function loadSettings(): Promise<AppSettings> {
  const row = await db.app_settings.get('app')
  if (!row) {
    await db.app_settings.put(DEFAULT_SETTINGS)
    return DEFAULT_SETTINGS
  }
  // Merge so settings added in later releases receive defaults.
  return {
    ...DEFAULT_SETTINGS,
    ...row,
    targets: { ...DEFAULT_SETTINGS.targets, ...row.targets },
    weights: { ...DEFAULT_SETTINGS.weights, ...row.weights },
  }
}

export async function saveSettings(patch: Partial<Omit<AppSettings, 'id'>>): Promise<AppSettings> {
  const current = await loadSettings()
  const next: AppSettings = { ...current, ...patch, id: 'app', updatedAt: new Date().toISOString() }
  await db.app_settings.put(next)
  return next
}
