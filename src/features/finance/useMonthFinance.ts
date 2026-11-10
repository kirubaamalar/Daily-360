import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/database/db'
import type { MonthKey } from '@/types/models'
import { recentMonths, summariseMonth } from './monthlySummary'

/** Personal transactions for one month plus the balance of that month and the 5 before it. */
export function useMonthFinance(month: MonthKey) {
  return useLiveQuery(async () => {
    const months = recentMonths(month, 6)
    const from = `${months[months.length - 1]}-01`
    const to = `${month}-31`
    const [expenses, income] = await Promise.all([
      db.expenses.where('[scope+date]').between(['personal', from], ['personal', to], true, true).toArray(),
      db.income.where('[scope+date]').between(['personal', from], ['personal', to], true, true).toArray(),
    ])
    return {
      summary: summariseMonth(month, expenses, income),
      history: months.map((m) => summariseMonth(m, expenses, income)),
      expenses: expenses.filter((e) => e.date.startsWith(month)),
      income: income.filter((i) => i.date.startsWith(month)),
    }
  }, [month])
}
