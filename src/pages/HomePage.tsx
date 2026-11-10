import { useState } from 'react'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import {
  BookOpen, Check, ChevronRight, FlaskConical, CheckCircle2, Circle, Droplets, HeartPulse, ListPlus, Moon, Plus, ReceiptIndianRupee,
  Sparkles, Trash2, X,
} from 'lucide-react'
import { DayDial } from '@/components/ui/DayDial'
import { Card, SectionHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useTodayData, type TodayData } from '@/features/dashboard/useTodayData'
import { calculateProductivity } from '@/features/analytics/productivity'
import { TransactionSheet } from '@/features/finance/TransactionSheet'
import { TaskSheet } from '@/features/dashboard/TaskSheet'
import { WellnessSheet } from '@/features/wellness/WellnessSheet'
import { StartStudySheet } from '@/features/study/StartStudySheet'
import { ActiveSessionCard } from '@/features/study/ActiveSessionCard'
import { taskRepo } from '@/services/repositories/taskRepo'
import { wellnessRepo } from '@/services/repositories/wellnessRepo'
import { habitRepo } from '@/services/repositories/habitRepo'
import { loadSampleData } from '@/services/sampleDataService'
import { useSettingsStore } from '@/stores/settingsStore'
import { toast } from '@/stores/toastStore'
import { useDataPresence } from '@/hooks/useSampleData'
import { formatMoney } from '@/utils/currency'
import { formatMinutes, greeting, todayKey } from '@/utils/date'
import { cn } from '@/utils/cn'

type SheetName = 'expense' | 'study' | 'task' | 'wellness' | null

const DIAL_COLORS = { tasks: '#8f97ff', study: '#6fc3a3', habits: '#f0c06a', work: '#7cb8e6' }

export default function HomePage() {
  const data = useTodayData()
  const presence = useDataPresence()
  const { settings } = useSettingsStore()
  const [sheet, setSheet] = useState<SheetName>(null)
  const close = () => setSheet(null)

  return (
    <>
      <Hero data={data} onAction={setSheet} />
      <div className="space-y-6 px-4 pt-5">
        {presence?.isEmpty && <FirstRun />}
        {presence?.hasSample && (
          <Link to="/settings" className="flex items-center gap-3 rounded-[16px] border border-amber/25 bg-amber-soft px-4 py-3 text-[13px] text-amber">
            <FlaskConical size={18} className="shrink-0" />
            <span className="flex-1">Sample data is included in these numbers. Remove it in Settings when you are ready.</span>
          </Link>
        )}
        {data?.activeSession && (
          <ActiveSessionCard session={data.activeSession} subject={data.subjects.find((s) => s.id === data.activeSession!.subjectId)} />
        )}
        {!data ? <LoadingBlocks /> : (
          <>
            <TasksCard data={data} onAdd={() => setSheet('task')} />
            <MoneyCard data={data} currency={settings.currency} locale={settings.locale} onAdd={() => setSheet('expense')} />
            <WellnessCard data={data} waterTarget={settings.targets.waterMl} sleepTarget={settings.targets.sleepHours} onEdit={() => setSheet('wellness')} />
            <HabitsCard data={data} />
            <WorkCard data={data} target={settings.targets.companyWorkMinutes} />
          </>
        )}
      </div>

      <TransactionSheet open={sheet === 'expense'} onClose={close} />
      <TaskSheet open={sheet === 'task'} onClose={close} />
      <WellnessSheet open={sheet === 'wellness'} onClose={close} date={data?.date ?? todayKey()} log={data?.wellness} />
      <StartStudySheet open={sheet === 'study'} onClose={close} subjects={data?.subjects ?? []} />
    </>
  )
}

function Hero({ data, onAction }: { data?: TodayData; onAction: (s: SheetName) => void }) {
  const { settings } = useSettingsStore()
  const now = new Date()
  const t = settings.targets

  const prod = data && calculateProductivity({
    studyMinutes: data.studyMinutes, tasksDone: data.tasks.filter((x) => x.done).length, tasksPlanned: data.tasks.length,
    habitsDone: data.habitsDone, habitsDue: data.habitsDue, companyMinutes: data.companyMinutes,
  }, t, settings.weights)

  const ratio = (k: string) => prod?.components.find((c) => c.key === k)?.ratio ?? 0
  const segments = [
    { key: 'tasks', label: 'Tasks', value: ratio('personalTasks'), color: DIAL_COLORS.tasks },
    { key: 'study', label: 'Study', value: ratio('study'), color: DIAL_COLORS.study },
    { key: 'habits', label: 'Habits', value: ratio('habits'), color: DIAL_COLORS.habits },
    { key: 'work', label: 'Work', value: ratio('companyWork'), color: DIAL_COLORS.work },
  ]

  const legend = data ? [
    { label: 'Tasks', value: `${data.tasks.filter((x) => x.done).length}/${data.tasks.length || t.personalTasks}`, color: DIAL_COLORS.tasks },
    { label: 'Study', value: `${formatMinutes(data.studyMinutes)} / ${formatMinutes(t.studyMinutes)}`, color: DIAL_COLORS.study },
    { label: 'Habits', value: data.habitsDue ? `${data.habitsDone}/${data.habitsDue}` : 'None set', color: DIAL_COLORS.habits },
    { label: 'Work', value: `${formatMinutes(data.companyMinutes)} / ${formatMinutes(t.companyWorkMinutes)}`, color: DIAL_COLORS.work },
  ] : []

  const actions = [
    { key: 'expense' as const, label: 'Expense', icon: ReceiptIndianRupee },
    { key: 'study' as const, label: 'Study', icon: BookOpen, disabled: !!data?.activeSession },
    { key: 'task' as const, label: 'Task', icon: ListPlus },
    { key: 'wellness' as const, label: 'Wellness', icon: HeartPulse },
  ]

  return (
    <section className="safe-top rounded-b-[32px] bg-ink px-5 pb-5 pt-6 text-white">
      <div className="flex items-baseline justify-between">
        <p className="font-display text-[22px] font-semibold tracking-[-0.02em]">
          {greeting(now)}{settings.displayName ? `, ${settings.displayName}` : ''}
        </p>
        <p className="text-[13px] text-[#9aa1c4]">{format(now, 'EEE, d MMM')}</p>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <DayDial segments={segments} size={176}>
          <div>
            <p className="font-display tabular text-[44px] font-semibold leading-none tracking-[-0.04em]">
              {prod?.score ?? '–'}<span className="text-[20px] text-[#9aa1c4]">{prod?.score != null ? '%' : ''}</span>
            </p>
            <p className="mt-1 text-[12px] text-[#9aa1c4]">of today’s plan</p>
          </div>
        </DayDial>
        <ul className="flex-1 space-y-2.5">
          {legend.map((l) => (
            <li key={l.label}>
              <p className="flex items-center gap-1.5 text-[12px] text-[#9aa1c4]"><span className="h-2 w-2 rounded-full" style={{ background: l.color }} />{l.label}</p>
              <p className="tabular text-[14px] font-semibold">{l.value}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2">
        {actions.map(({ key, label, icon: Icon, disabled }) => (
          <button key={key} onClick={() => onAction(key)} disabled={disabled}
            className="flex flex-col items-center gap-1.5 rounded-[18px] bg-ink-2 py-3 text-[12px] font-semibold text-white transition-transform active:scale-95 disabled:opacity-40">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10"><Icon size={18} /></span>
            {label}
          </button>
        ))}
      </div>
      <Link to="/analytics" className="mt-3 block text-center text-[12px] text-[#9aa1c4] underline-offset-2 hover:underline">
        How this percentage is calculated
      </Link>
    </section>
  )
}

function FirstRun() {
  const [busy, setBusy] = useState(false)
  return (
    <Card className="border border-indigo/15 bg-indigo-soft/60">
      <div className="flex gap-3">
        <Sparkles className="mt-0.5 shrink-0 text-indigo" size={20} />
        <div>
          <p className="font-display font-semibold text-ink">Welcome to Daily360</p>
          <p className="mt-1 text-[14px] leading-relaxed text-muted">
            Everything you record stays on this device. Start adding your own entries, or explore with sample data that is labelled and removable in Settings.
          </p>
          <Button size="sm" variant="soft" className="mt-3 bg-paper" disabled={busy}
            onClick={async () => { setBusy(true); try { await loadSampleData(); toast.success('Sample data loaded') } catch { toast.error('Could not load sample data') } finally { setBusy(false) } }}>
            Load sample data
          </Button>
        </div>
      </div>
    </Card>
  )
}

function TasksCard({ data, onAdd }: { data: TodayData; onAdd: () => void }) {
  return (
    <section>
      <SectionHeader title="Today’s tasks" action={<Button size="sm" variant="ghost" onClick={onAdd}><Plus size={16} /> Add</Button>} />
      {data.tasks.length === 0 ? (
        <EmptyState icon={ListPlus} title="Nothing planned yet" body="Add the few personal tasks that would make today count." action={<Button size="sm" onClick={onAdd}>Add a task</Button>} />
      ) : (
        <Card className="p-1.5">
          <ul>
            {data.tasks.map((t) => (
              <li key={t.id} className="group flex items-center gap-1">
                <button onClick={() => taskRepo.toggle(t)} aria-pressed={t.done}
                  className="flex min-h-12 flex-1 items-center gap-3 rounded-[14px] px-2.5 text-left active:bg-mist">
                  {t.done ? <CheckCircle2 size={22} className="shrink-0 text-sage" /> : <Circle size={22} className="shrink-0 text-faint" />}
                  <span className={cn('flex-1 text-[15px]', t.done && 'text-faint line-through')}>{t.title}</span>
                  {t.priority === 'high' && !t.done && <span className="rounded-full bg-rose-soft px-2 py-0.5 text-[11px] font-semibold text-rose">High</span>}
                </button>
                <button aria-label={`Delete ${t.title}`} onClick={async () => { await taskRepo.remove(t.id); toast.show('Task deleted') }}
                  className="grid h-10 w-10 place-items-center rounded-full text-faint hover:bg-mist hover:text-rose"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  )
}

function MoneyCard({ data, currency, locale, onAdd }: { data: TodayData; currency: string; locale: string; onAdd: () => void }) {
  const money = (v: number) => formatMoney(v, currency, locale)
  const m = data.month
  return (
    <section>
      <SectionHeader title="Money today" action={<Button size="sm" variant="ghost" onClick={onAdd}><Plus size={16} /> Add</Button>} />
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-[13px] text-muted">Spent</p>
          <p className="font-display tabular mt-1 text-[24px] font-semibold tracking-[-0.02em] text-ink">{money(data.spent)}</p>
          <p className="mt-0.5 text-[12px] text-faint">{data.expenseCount} {data.expenseCount === 1 ? 'entry' : 'entries'}</p>
        </Card>
        <Card>
          <p className="text-[13px] text-muted">Received</p>
          <p className="font-display tabular mt-1 text-[24px] font-semibold tracking-[-0.02em] text-sage">{money(data.earned)}</p>
          <p className="mt-0.5 text-[12px] text-faint">Personal only</p>
        </Card>
      </div>
      <Link to="/personal" className="mt-3 flex items-center gap-3 rounded-card bg-paper px-4 py-3.5 shadow-card active:bg-mist">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-muted">{format(new Date(), 'MMMM')} balance</p>
          <p className="tabular truncate text-[12px] text-faint">{money(m.income)} income − {money(m.expenses)} expenses</p>
        </div>
        <p className={cn('font-display tabular text-[20px] font-semibold', m.balance < 0 ? 'text-rose' : 'text-sage')}>
          {m.balance < 0 ? '−' : ''}{money(Math.abs(m.balance))}
        </p>
        <ChevronRight size={18} className="text-faint" />
      </Link>
    </section>
  )
}

function WellnessCard({ data, waterTarget, sleepTarget, onEdit }: { data: TodayData; waterTarget: number; sleepTarget: number; onEdit: () => void }) {
  const water = data.wellness?.waterMl ?? 0
  const sleep = data.wellness?.sleepHours
  return (
    <section>
      <SectionHeader title="Wellness" action={<Button size="sm" variant="ghost" onClick={onEdit}>{data.wellness ? 'Edit' : 'Record'}</Button>} />
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="flex items-center gap-2 text-[13px] text-muted"><Moon size={15} /> Sleep</div>
          <p className="font-display tabular mt-1 text-[24px] font-semibold text-ink">{sleep != null ? `${sleep}h` : '–'}</p>
          <ProgressBar className="mt-2" value={(sleep ?? 0) / sleepTarget} tone="bg-indigo" />
          <p className="mt-1.5 text-[12px] text-faint">Target {sleepTarget}h</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[13px] text-muted"><Droplets size={15} /> Water</span>
            <button aria-label="Add 250 ml water" onClick={async () => { const t = await wellnessRepo.addWater(data.date, 250); toast.show(`${t.toLocaleString()} ml today`) }}
              className="grid h-8 w-8 place-items-center rounded-full bg-sky-soft text-sky active:scale-90"><Plus size={16} /></button>
          </div>
          <p className="font-display tabular mt-1 text-[24px] font-semibold text-sky">{(water / 1000).toFixed(water % 1000 ? 2 : 1)}<span className="text-[15px]"> L</span></p>
          <ProgressBar className="mt-2" value={water / waterTarget} tone="bg-sky" />
          <p className="mt-1.5 text-[12px] text-faint">Target {(waterTarget / 1000).toFixed(1)} L</p>
        </Card>
      </div>
    </section>
  )
}

function HabitsCard({ data }: { data: TodayData }) {
  if (!data.habits.length) return null
  return (
    <section>
      <SectionHeader title="Habits" action={<span className="text-[13px] text-muted">{data.habitsDone} of {data.habitsDue} done</span>} />
      <div className="flex flex-wrap gap-2">
        {data.habits.map((h) => (
          <button key={h.id} onClick={() => habitRepo.cycle(h.id, data.date)}
            aria-label={`${h.name}: ${h.status ?? 'not marked'}. Tap to change.`}
            className={cn('flex h-11 items-center gap-2 rounded-full border px-4 text-[14px] font-semibold transition-colors',
              h.status === 'done' && 'border-sage bg-sage text-white',
              h.status === 'missed' && 'border-rose/30 bg-rose-soft text-rose',
              !h.status && 'border-line bg-paper text-text')}>
            {h.status === 'done' ? <Check size={16} /> : h.status === 'missed' ? <X size={16} /> : <Circle size={14} className="text-faint" />}
            {h.name}
          </button>
        ))}
      </div>
      <p className="mt-2 px-1 text-[12px] text-faint">Tap once for done, twice for missed, three times to clear.</p>
    </section>
  )
}

function WorkCard({ data, target }: { data: TodayData; target: number }) {
  return (
    <section>
      <SectionHeader title="Company work" action={<Link to="/company" className="text-[13px] font-semibold text-indigo">Open</Link>} />
      <Card className="bg-ink-2 text-white">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[13px] text-[#aab0d6]">Logged today</p>
            <p className="font-display tabular text-[26px] font-semibold">{formatMinutes(data.companyMinutes)}</p>
          </div>
          <p className="text-[13px] text-[#aab0d6]">of {formatMinutes(target)}</p>
        </div>
        <ProgressBar className="mt-3 bg-white/15" value={data.companyMinutes / target} tone="bg-[#7cb8e6]" />
        <div className="mt-4 grid grid-cols-3 divide-x divide-white/10 text-center">
          <Stat label="Open" value={data.companyOpen} />
          <Stat label="Due today" value={data.companyDueToday} />
          <Stat label="Overdue" value={data.companyOverdue} warn={data.companyOverdue > 0} />
        </div>
      </Card>
    </section>
  )
}

const Stat = ({ label, value, warn }: { label: string; value: number; warn?: boolean }) => (
  <div>
    <p className={cn('font-display tabular text-[20px] font-semibold', warn && 'text-[#f29aaa]')}>{value}</p>
    <p className="text-[12px] text-[#aab0d6]">{label}</p>
  </div>
)

function LoadingBlocks() {
  return <div className="space-y-4"><Skeleton className="h-36" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
}
