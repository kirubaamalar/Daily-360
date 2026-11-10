import { db } from '@/database/db'
import { stamp } from '@/utils/id'
import type { DayKey, HabitStatus } from '@/types/models'

export const habitRepo = {
  /** Cycles a habit for a day: unset → done → missed → unset. */
  cycle: async (habitId: string, date: DayKey) => {
    const existing = await db.habit_logs.where({ habitId, date }).first()
    const now = new Date().toISOString()
    if (!existing) return db.habit_logs.add(stamp({ habitId, date, status: 'done' as HabitStatus }))
    if (existing.status === 'done') return db.habit_logs.update(existing.id, { status: 'missed', updatedAt: now })
    return db.habit_logs.delete(existing.id)
  },
}
