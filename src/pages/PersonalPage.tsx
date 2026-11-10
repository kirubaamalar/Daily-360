import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, subDays } from 'date-fns'
import { ChevronLeft, ChevronRight, HeartPulse, ListChecks, Plus, ReceiptIndianRupee, Search, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, SectionHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { Input, Select } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TransactionSheet } from '@/features/finance/TransactionSheet'
import { TaskSheet } from '@/features/dashboard/TaskSheet'
import { WellnessSheet } from '@/features/wellness/WellnessSheet'
import { db } from '@/database/db'
import { financeRepo } from '@/services/repositories/financeRepo'
import { taskRepo } from '@/services/repositories/taskRepo'
import { useSettingsStore } from '@/stores/settingsStore'
import { toast } from '@/stores/toastStore'
import { EXPENSE_CATEGORIES, type WellnessLog } from '@/types/models'
import { formatMoney } from '@/utils/currency'
import { formatDay, toDayKey, toMonthKey, todayKey } from '@/utils/date'
import { useMonthFinance } from '@/features/finance/useMonthFinance'
import { monthLabel, shiftMonth } from '@/features/finance/monthlySummary'
import { cn } from '@/utils/cn'

type Tab = 'money' | 'tasks' | 'wellness'

export default function PersonalPage() {
  const [tab, setTab] = useState<Tab>('money')
  return (
    <>
      <PageHeader title="Personal" subtitle="Money, tasks, and wellness" />
      <div className="px-4">
        <Segmented label="Personal sections" className="mb-5" value={tab} onChange={setTab}
          options={[{ value: 'money', label: 'Money' }, { value: 'tasks', label: 'Tasks' }, { value: 'wellness', label: 'Wellness' }]} />
        {tab === 'money' && <MoneyTab />}
        {tab === 'tasks' && <TasksTab />}
        {tab === 'wellness' && <WellnessTab />}
      </div>
    </>
  )
}

type Txn = { id: string; date: string; amount: number; label: string; sub: string; type: 'expense' | 'income'; sample?: boolean }

const KIND_LABEL = { regular: '', emi: 'EMI', loan: 'Loan', savings: 'Savings' } as const

function MoneyTab() {
  const { settings } = useSettingsStore()
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(toMonthKey())
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [del, setDel] = useState<Txn>()
  const data = useMonthFinance(month)
  const isCurrent = month === toMonthKey()

  const rows = useMemo<Txn[] | undefined>(() => data && [
    ...data.expenses.map((x) => ({ id: x.id, date: x.date, amount: x.amount, type: 'expense' as const, sample: x.isSample,
      label: x.reference || x.note || x.category, sub: [x.category, KIND_LABEL[x.kind]].filter(Boolean).join(' / ') })),
    ...data.income.map((x) => ({ id: x.id, date: x.date, amount: x.amount, type: 'income' as const, sample: x.isSample, label: x.source, sub: x.note || 'Income' })),
  ].sort((a, b) => b.date.localeCompare(a.date)), [data])

  const filtered = useMemo(() => (rows ?? []).filter((r) =>
    (cat === 'all' || (cat === 'income' ? r.type === 'income' : r.type === 'expense' && r.sub.startsWith(cat))) &&
    (!q || `${r.label} ${r.sub}`.toLowerCase().includes(q.toLowerCase()))), [rows, q, cat])

  const groups = useMemo(() => {
    const m = new Map<string, Txn[]>()
    filtered.forEach((r) => m.set(r.date, [...(m.get(r.date) ?? []), r]))
    return [...m.entries()]
  }, [filtered])

  const money = (v: number) => formatMoney(v, settings.currency, settings.locale)
  const s = data?.summary

  return (
    <div className="space-y-4">
      <Card className="bg-ink p-5 text-white">
        <div className="flex items-center justify-between">
          <button aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 active:scale-90"><ChevronLeft size={20} /></button>
          <p className="font-display text-[17px] font-semibold">{monthLabel(month)}</p>
          <button aria-label="Next month" disabled={isCurrent} onClick={() => setMonth(shiftMonth(month, 1))}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 active:scale-90 disabled:opacity-30"><ChevronRight size={20} /></button>
        </div>

        <p className="mt-5 text-center text-[13px] text-[#aab0d6]">Balance</p>
        <p className={cn('font-display tabular text-center text-[38px] font-semibold leading-tight tracking-[-0.03em]', s && s.balance < 0 ? 'text-[#f29aaa]' : 'text-[#8fe0bd]')}>
          {s ? `${s.balance < 0 ? '−' : ''}${money(Math.abs(s.balance))}` : '–'}
        </p>
        <p className="text-center text-[12px] text-[#aab0d6]">
          {s?.keptPercent != null ? (s.keptPercent >= 0 ? `${s.keptPercent}% of income left` : 'Spent more than earned') : 'No income recorded this month'}
        </p>

        <div className="mt-5 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-1 rounded-[16px] bg-white/[0.06] px-3 py-3 text-center">
          <div><p className="text-[11px] text-[#aab0d6]">Income</p><p className="tabular text-[14px] font-semibold text-[#8fe0bd]">{s ? money(s.income) : '–'}</p></div>
          <span className="text-[#6b739c]">−</span>
          <div><p className="text-[11px] text-[#aab0d6]">Expenses</p><p className="tabular text-[14px] font-semibold text-[#f29aaa]">{s ? money(s.expenses) : '–'}</p></div>
          <span className="text-[#6b739c]">=</span>
          <div><p className="text-[11px] text-[#aab0d6]">Balance</p><p className="tabular text-[14px] font-semibold">{s ? money(s.balance) : '–'}</p></div>
        </div>
        {s && s.commitments > 0 && (
          <p className="mt-2 text-center text-[12px] text-[#aab0d6]">Expenses include {money(s.commitments)} of EMI, loans and savings</p>
        )}
      </Card>

      <Button block onClick={() => setOpen(true)}><Plus size={18} /> Add transaction</Button>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <Input aria-label="Search transactions" type="search" placeholder="Search" className="pl-10" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select aria-label="Filter" className="w-[132px]" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="all">All</option><option value="income">Income</option>
          {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>

      {!rows ? <Skeleton className="h-48" /> : groups.length === 0 ? (
        <EmptyState icon={ReceiptIndianRupee} title={rows.length ? 'No matches' : `No transactions in ${monthLabel(month, 'MMMM')}`}
          body={rows.length ? 'Try another search or filter.' : 'Income and expenses you add for this month will show here.'} />
      ) : groups.map(([date, items]) => (
        <section key={date}>
          <p className="mb-2 px-1 text-[13px] font-semibold text-muted">{date === todayKey() ? 'Today' : formatDay(date, 'EEEE, d MMM')}</p>
          <Card className="divide-y divide-line p-0">
            {items.map((r) => (
              <div key={r.id} className="flex items-center gap-3 py-3 pl-4 pr-1.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium text-ink">{r.label}{r.sample && <span className="ml-2 rounded bg-amber-soft px-1.5 py-0.5 text-[10px] font-semibold text-amber">Sample</span>}</p>
                  <p className="truncate text-[12px] text-faint">{r.sub}</p>
                </div>
                <p className={cn('font-display tabular text-[15px] font-semibold', r.type === 'income' ? 'text-sage' : 'text-ink')}>
                  {r.type === 'income' ? '+' : '−'}{money(r.amount)}
                </p>
                <button aria-label={`Delete ${r.label}`} onClick={() => setDel(r)} className="grid h-10 w-10 place-items-center rounded-full text-faint hover:bg-mist hover:text-rose"><Trash2 size={16} /></button>
              </div>
            ))}
          </Card>
        </section>
      ))}

      {data && data.history.some((h) => h.count > 0) && (
        <section className="pt-2">
          <SectionHeader title="Month-wise balance" />
          <Card className="divide-y divide-line p-0">
            {data.history.map((h) => (
              <button key={h.month} onClick={() => { setMonth(h.month); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                className={cn('flex w-full items-center gap-3 px-4 py-3 text-left active:bg-mist', h.month === month && 'bg-indigo-soft/50')}>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-ink">{monthLabel(h.month, 'MMM yyyy')}</p>
                  <p className="tabular truncate text-[12px] text-faint">{h.count === 0 ? 'No entries' : `In ${money(h.income)}, out ${money(h.expenses)}`}</p>
                </div>
                <p className={cn('font-display tabular text-[15px] font-semibold', h.count === 0 ? 'text-faint' : h.balance < 0 ? 'text-rose' : 'text-sage')}>
                  {h.count === 0 ? '–' : `${h.balance < 0 ? '−' : ''}${money(Math.abs(h.balance))}`}
                </p>
              </button>
            ))}
          </Card>
        </section>
      )}

      <TransactionSheet open={open} onClose={() => setOpen(false)} />
      <ConfirmDialog open={!!del} title="Delete transaction?" tone="danger" confirmLabel="Delete"
        body={del && `${del.label}, ${money(del.amount)} on ${formatDay(del.date, settings.dateFormat)}.`}
        onCancel={() => setDel(undefined)}
        onConfirm={async () => {
          await (del!.type === 'expense' ? financeRepo.deleteExpense(del!.id) : financeRepo.deleteIncome(del!.id))
          setDel(undefined); toast.show('Transaction deleted')
        }} />
    </div>
  )
}

function TasksTab() {
  const [open, setOpen] = useState(false)
  const from = toDayKey(subDays(new Date(), 7))
  const tasks = useLiveQuery(() => db.daily_tasks.where('date').aboveOrEqual(from).reverse().sortBy('date'), [from])
  const today = todayKey()

  return (
    <div className="space-y-4">
      <Button block onClick={() => setOpen(true)}><Plus size={18} /> Add task</Button>
      {!tasks ? <Skeleton className="h-40" /> : tasks.length === 0 ? (
        <EmptyState icon={ListChecks} title="No tasks this week" body="Tasks you plan for today or upcoming days appear here." />
      ) : (
        <Card className="divide-y divide-line p-0">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-3 py-2 pl-3 pr-1.5">
              <input type="checkbox" checked={t.done} onChange={() => taskRepo.toggle(t)} aria-label={`Mark ${t.title} ${t.done ? 'not done' : 'done'}`} className="h-5 w-5 accent-[#2f8a69]" />
              <div className="min-w-0 flex-1 py-1">
                <p className={cn('truncate text-[15px]', t.done ? 'text-faint line-through' : 'text-ink')}>{t.title}</p>
                <p className={cn('text-[12px]', !t.done && t.date < today ? 'text-rose' : 'text-faint')}>
                  {t.date === today ? 'Today' : formatDay(t.date, 'EEE d MMM')}{!t.done && t.date < today ? ', not done' : ''}{t.priority === 'high' ? ', high priority' : ''}
                </p>
              </div>
              <button aria-label={`Delete ${t.title}`} onClick={() => taskRepo.remove(t.id)} className="grid h-10 w-10 place-items-center rounded-full text-faint hover:bg-mist hover:text-rose"><Trash2 size={16} /></button>
            </div>
          ))}
        </Card>
      )}
      <TaskSheet open={open} onClose={() => setOpen(false)} />
    </div>
  )
}

function WellnessTab() {
  const [edit, setEdit] = useState<{ date: string; log?: WellnessLog }>()
  const logs = useLiveQuery(() => db.wellness_logs.orderBy('date').reverse().limit(30).toArray())
  const today = todayKey()
  const hasToday = logs?.some((l) => l.date === today)
  const mood = ['', 'Low', 'Flat', 'Steady', 'Good', 'Great']

  return (
    <div className="space-y-4">
      <Button block onClick={() => setEdit({ date: today, log: logs?.find((l) => l.date === today) })}>
        <HeartPulse size={18} /> {hasToday ? 'Update today' : 'Record today'}
      </Button>
      {!logs ? <Skeleton className="h-40" /> : logs.length === 0 ? (
        <EmptyState icon={HeartPulse} title="No wellness entries yet" body="Sleep, water, movement, mood and journal notes build up here day by day." />
      ) : (
        <Card className="divide-y divide-line p-0">
          {logs.map((l) => (
            <button key={l.id} onClick={() => setEdit({ date: l.date, log: l })} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-mist">
              <div className="w-12 shrink-0 text-center">
                <p className="font-display text-[20px] font-semibold leading-none text-ink">{format(new Date(l.date + 'T00:00'), 'd')}</p>
                <p className="text-[11px] text-faint">{format(new Date(l.date + 'T00:00'), 'EEE')}</p>
              </div>
              <div className="grid flex-1 grid-cols-3 gap-1 text-[13px]">
                <span className="text-muted">Sleep <b className="text-ink">{l.sleepHours != null ? `${l.sleepHours}h` : '–'}</b></span>
                <span className="text-muted">Water <b className="text-sky">{l.waterMl != null ? `${(l.waterMl / 1000).toFixed(1)}L` : '–'}</b></span>
                <span className="text-muted">Mood <b className="text-ink">{l.mood ? mood[l.mood] : '–'}</b></span>
              </div>
            </button>
          ))}
        </Card>
      )}
      <WellnessSheet open={!!edit} onClose={() => setEdit(undefined)} date={edit?.date ?? today} log={edit?.log} />
    </div>
  )
}
