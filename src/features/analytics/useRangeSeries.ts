import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { db } from '@/database/db'
import { fromDayKey, lastNDays } from '@/utils/date'
import { sumMoney } from '@/utils/currency'

/** Per-day series for the last n days, built from stored records only. */
export function useRangeSeries(n: number) {
  return useLiveQuery(async () => {
    const days = lastNDays(n)
    const from = days[0], to = days[days.length - 1]
    const [exp, inc, sessions, work] = await Promise.all([
      db.expenses.where('[scope+date]').between(['personal', from], ['personal', to], true, true).toArray(),
      db.income.where('[scope+date]').between(['personal', from], ['personal', to], true, true).toArray(),
      db.study_sessions.where('date').between(from, to, true, true).filter((s) => !!s.endedAt).toArray(),
      db.company_work_logs.where('date').between(from, to, true, true).toArray(),
    ])
    const series = days.map((d) => ({
      date: d,
      label: format(fromDayKey(d), n > 10 ? 'd' : 'EEE'),
      expense: sumMoney(exp.filter((e) => e.date === d && e.kind === 'regular').map((e) => e.amount)),
      commitments: sumMoney(exp.filter((e) => e.date === d && e.kind !== 'regular').map((e) => e.amount)),
      income: sumMoney(inc.filter((i) => i.date === d).map((i) => i.amount)),
      study: sessions.filter((s) => s.date === d).reduce((a, s) => a + s.durationMinutes, 0),
      work: work.filter((w) => w.date === d).reduce((a, w) => a + w.minutes, 0),
    }))
    const totals = {
      income: sumMoney(series.map((s) => s.income)),
      spent: sumMoney(series.map((s) => s.expense + s.commitments)),
      saved: sumMoney(exp.filter((e) => e.kind === 'savings').map((e) => e.amount)),
      study: series.reduce((a, s) => a + s.study, 0),
      work: series.reduce((a, s) => a + s.work, 0),
    }
    return { series, totals }
  }, [n])
}
