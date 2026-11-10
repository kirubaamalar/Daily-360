import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/database/db'
import { sumMoney } from '@/utils/currency'
import { todayKey } from '@/utils/date'
import { summariseMonth } from '@/features/finance/monthlySummary'

/** Everything the Home dashboard needs for one day, read live from IndexedDB. */
export function useTodayData(date: string = todayKey()) {
  return useLiveQuery(async () => {
    const [expenses, income, sessions, habits, habitLogs, wellness, tasks, workLogs, companyTasks, subjects] = await Promise.all([
      db.expenses.where('[scope+date]').equals(['personal', date]).toArray(),
      db.income.where('[scope+date]').equals(['personal', date]).toArray(),
      db.study_sessions.where('date').equals(date).toArray(),
      db.habits.orderBy('order').filter((h) => !h.archived).toArray(),
      db.habit_logs.where('date').equals(date).toArray(),
      db.wellness_logs.where('date').equals(date).first(),
      db.daily_tasks.where('date').equals(date).toArray(),
      db.company_work_logs.where('date').equals(date).toArray(),
      db.company_tasks.filter((t) => t.status !== 'done').toArray(),
      db.study_subjects.filter((s) => !s.archived).toArray(),
    ])
    const month = date.slice(0, 7)
    const [monthExpenses, monthIncome] = await Promise.all([
      db.expenses.where('[scope+date]').between(['personal', `${month}-01`], ['personal', `${month}-31`], true, true).toArray(),
      db.income.where('[scope+date]').between(['personal', `${month}-01`], ['personal', `${month}-31`], true, true).toArray(),
    ])
    const activeSession = await db.study_sessions.filter((s) => !s.endedAt).first()
    const dailyHabits = habits.filter((h) => h.frequency === 'daily')
    const statusOf = new Map(habitLogs.map((l) => [l.habitId, l.status]))

    return {
      date,
      spent: sumMoney(expenses.map((e) => e.amount)),
      earned: sumMoney(income.map((i) => i.amount)),
      expenseCount: expenses.length,
      month: summariseMonth(month, monthExpenses, monthIncome),
      studyMinutes: sessions.filter((s) => s.endedAt).reduce((a, s) => a + s.durationMinutes, 0),
      activeSession,
      subjects,
      habits: dailyHabits.map((h) => ({ ...h, status: statusOf.get(h.id) })),
      habitsDone: dailyHabits.filter((h) => statusOf.get(h.id) === 'done').length,
      habitsDue: dailyHabits.length,
      wellness,
      tasks: tasks.sort((a, b) => Number(a.done) - Number(b.done) || a.createdAt.localeCompare(b.createdAt)),
      companyMinutes: workLogs.reduce((a, l) => a + l.minutes, 0),
      companyOpen: companyTasks.length,
      companyDueToday: companyTasks.filter((t) => t.deadline === date).length,
      companyOverdue: companyTasks.filter((t) => t.deadline && t.deadline < date).length,
    }
  }, [date])
}
export type TodayData = NonNullable<ReturnType<typeof useTodayData>>
