import { z } from 'zod'
import { format } from 'date-fns'
import { db, DATA_TABLES, type DataTableName } from '@/database/db'
import { downloadText } from './download'
import { saveSettings } from './settingsService'

export const BACKUP_SCHEMA_VERSION = 1

const recordSchema = z.looseObject({ id: z.string().min(1) })

const backupSchema = z.object({
  app: z.literal('Daily360'),
  schemaVersion: z.number().int().min(1).max(BACKUP_SCHEMA_VERSION),
  exportedAt: z.string(),
  tables: z.record(z.string(), z.array(recordSchema)),
})
export type BackupFile = z.infer<typeof backupSchema>

export async function createBackup(): Promise<BackupFile> {
  const tables: Record<string, unknown[]> = {}
  await db.transaction('r', DATA_TABLES.map((t) => db.table(t)), async () => {
    for (const t of DATA_TABLES) tables[t] = await db.table(t).toArray()
  })
  return {
    app: 'Daily360',
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    tables: tables as BackupFile['tables'],
  }
}

export async function downloadBackup() {
  const backup = await createBackup()
  const now = new Date()
  // Record the backup time before serialising so the file reflects it too.
  await saveSettings({ lastBackupAt: now.toISOString() })
  const settings = backup.tables.app_settings?.[0]
  if (settings) settings.lastBackupAt = now.toISOString()
  downloadText(`daily360-backup-${format(now, 'yyyy-MM-dd-HHmm')}.json`, JSON.stringify(backup, null, 2), 'application/json')
  return now
}

export interface RestoreSummary {
  counts: Partial<Record<DataTableName, number>>
  exportedAt: string
}

/** Parses and validates a backup without touching the database. */
export function parseBackup(text: string): BackupFile {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error('This file is not valid JSON. Choose a file exported from Daily360.')
  }
  const result = backupSchema.safeParse(json)
  if (!result.success) {
    throw new Error('This file is not a Daily360 backup, or it was made by a newer version of the app.')
  }
  const unknown = Object.keys(result.data.tables).filter((t) => !(DATA_TABLES as readonly string[]).includes(t))
  if (unknown.length) throw new Error(`The backup contains unknown sections: ${unknown.join(', ')}.`)
  return result.data
}

export function summarise(backup: BackupFile): RestoreSummary {
  const counts: RestoreSummary['counts'] = {}
  for (const t of DATA_TABLES) counts[t] = backup.tables[t]?.length ?? 0
  return { counts, exportedAt: backup.exportedAt }
}

/** Replaces all local data with the backup contents in one atomic transaction. */
export async function restoreBackup(backup: BackupFile) {
  await db.transaction('rw', DATA_TABLES.map((t) => db.table(t)), async () => {
    for (const t of DATA_TABLES) {
      await db.table(t).clear()
      const rows = backup.tables[t]
      if (rows?.length) await db.table(t).bulkAdd(rows)
    }
  })
}

/** Deletes every record, including settings. */
export async function resetAllData() {
  await db.transaction('rw', DATA_TABLES.map((t) => db.table(t)), async () => {
    for (const t of DATA_TABLES) await db.table(t).clear()
  })
}
