import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/database/db'

/** Live flags used for first-run and the sample-data banner. */
export function useDataPresence() {
  return useLiveQuery(async () => {
    const tables = [db.expenses, db.income, db.study_sessions, db.habits, db.wellness_logs, db.daily_tasks, db.company_tasks, db.company_work_logs]
    let total = 0
    let sample = 0
    for (const t of tables) {
      const rows = await (t as typeof db.expenses).toArray()
      total += rows.length
      sample += rows.filter((r) => r.isSample).length
    }
    return { isEmpty: total === 0, hasSample: sample > 0 }
  })
}
