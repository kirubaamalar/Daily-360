import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart3 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, SectionHeader } from '@/components/ui/Card'
import { Segmented } from '@/components/ui/Segmented'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useTodayData } from '@/features/dashboard/useTodayData'
import { useRangeSeries } from '@/features/analytics/useRangeSeries'
import { calculateProductivity } from '@/features/analytics/productivity'
import { useSettingsStore } from '@/stores/settingsStore'
import { formatMoney } from '@/utils/currency'
import { formatMinutes } from '@/utils/date'

const axis = { fontSize: 11, fill: '#8a90aa' }

export default function AnalyticsPage() {
  const [range, setRange] = useState<'7' | '30'>('7')
  const today = useTodayData()
  const data = useRangeSeries(Number(range))
  const { settings } = useSettingsStore()
  const money = (v: number, compact = false) => formatMoney(v, settings.currency, settings.locale, compact)

  const prod = today && calculateProductivity({
    studyMinutes: today.studyMinutes, tasksDone: today.tasks.filter((t) => t.done).length, tasksPlanned: today.tasks.length,
    habitsDone: today.habitsDone, habitsDue: today.habitsDue, companyMinutes: today.companyMinutes,
  }, settings.targets, settings.weights)
  const weightSum = prod?.components.filter((c) => c.target > 0 && c.weight > 0).reduce((a, c) => a + c.weight, 0) ?? 0

  const savingsRate = data && data.totals.income > 0 ? Math.round(((data.totals.income - data.totals.spent) / data.totals.income) * 100) : null
  const hasMoney = !!data?.series.some((s) => s.income || s.expense || s.commitments)
  const hasTime = !!data?.series.some((s) => s.study || s.work)

  return (
    <>
      <PageHeader title="Analytics" subtitle="Built from what you have recorded" />
      <div className="space-y-7 px-4">
        <section>
          <SectionHeader title="Today’s productivity" action={prod?.score != null ? <span className="font-display tabular text-[22px] font-semibold text-indigo">{prod.score}%</span> : undefined} />
          <Card className="space-y-4">
            {!prod ? <Skeleton className="h-32" /> : prod.components.map((c) => {
              const counted = c.target > 0 && c.weight > 0
              const fmt = (v: number) => (c.unit === 'min' ? formatMinutes(v) : String(v))
              return (
                <div key={c.key}>
                  <div className="flex items-baseline justify-between text-[14px]">
                    <span className="font-semibold text-ink">{c.label}</span>
                    <span className="tabular text-muted">{fmt(c.actual)} / {c.target ? fmt(c.target) : 'no target'}</span>
                  </div>
                  <ProgressBar className="mt-1.5" value={c.ratio} tone={counted ? 'bg-indigo' : 'bg-faint'} />
                  <p className="mt-1 text-[12px] text-faint">
                    {counted ? `Weight ${c.weight} of ${weightSum}, contributes ${Math.round((c.weight / weightSum) * c.ratio * 100)} points` : 'Not counted today (no target or zero weight)'}
                  </p>
                </div>
              )
            })}
            <p className="border-t border-line pt-3 text-[12px] leading-relaxed text-muted">
              Each area scores actual ÷ target, capped at 100%. The daily percentage is the weighted average of areas with a target. Change targets and weights in Settings. Wellness data is never part of this number.
            </p>
          </Card>
        </section>

        <Segmented label="Range" value={range} onChange={setRange} options={[{ value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' }]} />

        <section>
          <SectionHeader title="Income and spending" />
          {!data ? <Skeleton className="h-64" /> : !hasMoney ? (
            <EmptyState icon={BarChart3} title="No transactions in this range" body="Add income or expenses and this chart fills in." />
          ) : (
            <Card>
              <div className="mb-4 grid grid-cols-3 gap-2">
                <Kpi label="Income" value={money(data.totals.income, true)} tone="text-sage" />
                <Kpi label="Spent" value={money(data.totals.spent, true)} tone="text-rose" />
                <Kpi label="Kept" value={savingsRate == null ? '–' : `${savingsRate}%`} tone="text-ink" hint={savingsRate == null ? 'No income' : undefined} />
              </div>
              <div className="h-52">
                <ResponsiveContainer>
                  <BarChart data={data.series} barGap={2} margin={{ left: -18, right: 4, top: 4 }}>
                    <CartesianGrid vertical={false} stroke="#e3e5ee" />
                    <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} interval={range === '30' ? 4 : 0} />
                    <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={(v) => money(v, true)} width={56} />
                    <Tooltip cursor={{ fill: '#f2f3f7' }} formatter={(v) => money(Number(v))} contentStyle={{ borderRadius: 12, border: '1px solid #e3e5ee', fontSize: 13 }} />
                    <Bar dataKey="income" name="Income" fill="#2f8a69" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Everyday spend" stackId="out" fill="#c8475e" />
                    <Bar dataKey="commitments" name="EMI, loans, savings" stackId="out" fill="#e7a3b0" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-[12px] text-faint">Personal transactions only. “Kept” is income minus all outgoings for this range.</p>
            </Card>
          )}
        </section>

        <section>
          <SectionHeader title="Study and company time" />
          {!data ? <Skeleton className="h-64" /> : !hasTime ? (
            <EmptyState icon={BarChart3} title="No time logged in this range" body="Study sessions and company work logs appear here as separate bars." />
          ) : (
            <Card>
              <div className="mb-4 grid grid-cols-2 gap-2">
                <Kpi label="Study" value={formatMinutes(data.totals.study)} tone="text-sage" />
                <Kpi label="Company work" value={formatMinutes(data.totals.work)} tone="text-indigo" />
              </div>
              <div className="h-52">
                <ResponsiveContainer>
                  <BarChart data={data.series} margin={{ left: -18, right: 4, top: 4 }}>
                    <CartesianGrid vertical={false} stroke="#e3e5ee" />
                    <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} interval={range === '30' ? 4 : 0} />
                    <YAxis tick={axis} tickLine={false} axisLine={false} width={40} ticks={hourTicks(data.series)} domain={[0, hourTicks(data.series).at(-1)!]}
                      tickFormatter={(v) => `${v / 60}h`} />
                    <Tooltip cursor={{ fill: '#f2f3f7' }} formatter={(v) => formatMinutes(Number(v))} contentStyle={{ borderRadius: 12, border: '1px solid #e3e5ee', fontSize: 13 }} />
                    <Bar dataKey="study" name="Study" fill="#2f8a69" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="work" name="Company" fill="#4c55c9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </section>
      </div>
    </>
  )
}

/** Whole-hour ticks (every 1, 2 or 4 hours) so the axis never shows fractional hours. */
function hourTicks(series: { study: number; work: number }[]) {
  const max = Math.max(60, ...series.map((s) => Math.max(s.study, s.work)))
  const step = max > 8 * 60 ? 240 : max > 4 * 60 ? 120 : 60
  const top = Math.ceil(max / step) * step
  return Array.from({ length: top / step + 1 }, (_, i) => i * step)
}

function Kpi({ label, value, tone, hint }: { label: string; value: string; tone: string; hint?: string }) {
  return (
    <div className="rounded-[14px] bg-mist px-3 py-2.5">
      <p className="text-[12px] text-muted">{label}</p>
      <p className={`font-display tabular text-[18px] font-semibold ${tone}`}>{value}</p>
      {hint && <p className="text-[11px] text-faint">{hint}</p>}
    </div>
  )
}
