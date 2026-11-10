import { format } from 'date-fns'
import { db } from '@/database/db'
import { downloadText } from './download'

function cell(v: unknown): string {
  if (v === undefined || v === null) return ''
  const s = String(v)
  // Guard against spreadsheet formula injection, then quote when needed.
  const safe = /^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s)) ? `'${s}` : s
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function toCsv(headers: string[], rows: unknown[][]) {
  return [headers, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')
}

export interface TransactionCsvOptions {
  from?: string
  to?: string
  includeCompany: boolean
}

/** Exports income and expenses as one ledger, oldest first. */
export async function exportTransactionsCsv({ from, to, includeCompany }: TransactionCsvOptions) {
  const inRange = (d: string) => (!from || d >= from) && (!to || d <= to)
  const scopeOk = (s: string) => includeCompany || s === 'personal'

  const [expenses, income] = await Promise.all([db.expenses.toArray(), db.income.toArray()])
  const rows = [
    ...expenses.filter((e) => inRange(e.date) && scopeOk(e.scope)).map((e) => ({
      date: e.date, type: 'Expense', kind: e.kind, category: e.category, scope: e.scope,
      amount: -e.amount, reference: e.reference ?? '', note: e.note ?? '', sample: e.isSample ? 'yes' : '',
    })),
    ...income.filter((i) => inRange(i.date) && scopeOk(i.scope)).map((i) => ({
      date: i.date, type: 'Income', kind: '', category: i.source, scope: i.scope,
      amount: i.amount, reference: '', note: i.note ?? '', sample: i.isSample ? 'yes' : '',
    })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  const csv = toCsv(
    ['Date', 'Type', 'Kind', 'Category / Source', 'Scope', 'Amount', 'Reference', 'Note', 'Sample data'],
    rows.map((r) => [r.date, r.type, r.kind, r.category, r.scope, r.amount.toFixed(2), r.reference, r.note, r.sample]),
  )
  // BOM so Excel opens ₹ and other symbols correctly.
  downloadText(`daily360-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`, '\uFEFF' + csv, 'text/csv;charset=utf-8')
  return rows.length
}
