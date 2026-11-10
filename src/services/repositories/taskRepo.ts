import { db } from '@/database/db'
import { stamp } from '@/utils/id'
import type { DailyTask } from '@/types/models'

type New<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'isSample'>

export const taskRepo = {
  add: (t: New<DailyTask>) => db.daily_tasks.add(stamp(t)),
  toggle: async (task: DailyTask) => {
    const now = new Date().toISOString()
    await db.daily_tasks.update(task.id, { done: !task.done, completedAt: task.done ? undefined : now, updatedAt: now })
  },
  remove: (id: string) => db.daily_tasks.delete(id),
}
