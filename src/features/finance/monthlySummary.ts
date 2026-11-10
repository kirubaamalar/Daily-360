import { addMonths, format, parseISO } from 'date-fns'
import type { Expense, Income, MonthKey } from '@/types/models'
import { sumMoney } from '@/utils/currency'

export interface MonthSummary {
  month: MonthKey
  income: number
  /** everyday spending (kind = regular) */
  spending: number
  /** EMI, loan repayments and money moved to savings */
  commitments: number
  /** spending + commitments */
  expenses: number
  /** income − expenses */
  balance: number
  /** share of income left over, null when there was no income */
  keptPercent: number | null
  count: number
}

/**
 * Month-wise balance: Income − Expenses = Balance.
 * Only personal records are summarised; pass already-filtered arrays.
 */
export function summariseMonth(month: MonthKey, expenses: Expense[], income: Income[]): MonthSummary {
  const ex = expenses.filter((e) => e.date.startsWith(month))
  const inc = income.filter((i) => i.date.startsWith(month))
  const totalIncome = sumMoney(inc.map((i) => i.amount))
  const spending = sumMoney(ex.filter((e) => e.kind === 'regular').map((e) => e.amount))
  const commitments = sumMoney(ex.filter((e) => e.kind !== 'regular').map((e) => e.amount))
  const totalExpenses = sumMoney([spending, commitments])
  const balance = sumMoney([totalIncome, -totalExpenses])
  return {
    month,
    income: totalIncome,
    spending,
    commitments,
    expenses: totalExpenses,
    balance,
    keptPercent: totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : null,
    count: ex.length + inc.length,
  }
}

/** Month keys ending at `end`, newest first. */
export function recentMonths(end: MonthKey, n: number): MonthKey[] {
  const d = parseISO(`${end}-01`)
  return Array.from({ length: n }, (_, i) => format(addMonths(d, -i), 'yyyy-MM'))
}

export const shiftMonth = (m: MonthKey, by: number): MonthKey => format(addMonths(parseISO(`${m}-01`), by), 'yyyy-MM')
export const monthLabel = (m: MonthKey, pattern = 'MMMM yyyy') => format(parseISO(`${m}-01`), pattern)
