import { db } from '@/database/db'
import { stamp } from '@/utils/id'
import type { DayKey, WellnessLog } from '@/types/models'

type Fields = Omit<WellnessLog, 'id' | 'createdAt' | 'updatedAt' | 'isSample' | 'date'>

export const wellnessRepo = {
  forDay: (date: DayKey) => db.wellness_logs.where('date').equals(date).first(),

  /** One log per day: merges into the existing log or creates it. Real edits clear the sample flag. */
  upsert: async (date: DayKey, fields: Fields) => {
    const existing = await db.wellness_logs.where('date').equals(date).first()
    if (existing) {
      await db.wellness_logs.update(existing.id, { ...fields, isSample: undefined, updatedAt: new Date().toISOString() })
    } else {
      await db.wellness_logs.add(stamp({ date, ...fields }))
    }
  },

  addWater: async (date: DayKey, ml: number) => {
    const existing = await db.wellness_logs.where('date').equals(date).first()
    const waterMl = Math.max(0, (existing?.waterMl ?? 0) + ml)
    await wellnessRepo.upsert(date, { ...stripMeta(existing), waterMl })
    return waterMl
  },
}

function stripMeta(log?: WellnessLog): Fields {
  if (!log) return {}
  const { id: _i, createdAt: _c, updatedAt: _u, isSample: _s, date: _d, ...rest } = log
  return rest
}
