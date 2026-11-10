import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Briefcase, Clock3, GraduationCap, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, SectionHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { WorkLogSheet } from '@/features/company/WorkLogSheet'
import { db } from '@/database/db'
import { useSettingsStore } from '@/stores/settingsStore'
import { toast } from '@/stores/toastStore'
import { formatDay, formatMinutes, todayKey, weekRange } from '@/utils/date'

export default function CompanyPage() {
  const { settings } = useSettingsStore()
  const [open, setOpen] = useState(false)
  const week = weekRange(new Date(), settings.weekStartsOn)

  const data = useLiveQuery(async () => {
    const [projects, tasks, logs] = await Promise.all([
      db.company_projects.toArray(),
      db.company_tasks.toArray(),
      db.company_work_logs.where('date').between(week.start, week.end, true, true).toArray(),
    ])
    return {
      projects,
      logs: logs.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
      weekMinutes: logs.reduce((a, l) => a + l.minutes, 0),
      learningMinutes: logs.filter((l) => l.isLearning).reduce((a, l) => a + l.minutes, 0),
      open: tasks.filter((t) => t.status !== 'done'),
      doneThisWeek: tasks.filter((t) => t.completedAt && t.completedAt.slice(0, 10) >= week.start).length,
    }
  }, [week.start, week.end])

  return (
    <>
      <PageHeader title="Company" subtitle="Kept separate from your personal life" />
      <div className="space-y-7 px-4">
        <Card className="bg-ink text-white">
          <p className="text-[13px] text-[#aab0d6]">This week, {formatDay(week.start, 'd MMM')} to {formatDay(week.end, 'd MMM')}</p>
          <p className="font-display tabular mt-1 text-[34px] font-semibold tracking-[-0.03em]">{data ? formatMinutes(data.weekMinutes) : '–'}</p>
          <div className="mt-3 flex gap-5 text-[13px] text-[#c3c8e4]">
            <span className="flex items-center gap-1.5"><GraduationCap size={15} /> {data ? formatMinutes(data.learningMinutes) : '–'} learning</span>
            <span className="flex items-center gap-1.5"><Briefcase size={15} /> {data?.open.length ?? '–'} open tasks</span>
          </div>
          <Button variant="primary" block className="mt-4" onClick={() => setOpen(true)}><Plus size={18} /> Log work time</Button>
        </Card>

        {data && data.open.length > 0 && (
          <section>
            <SectionHeader title="Open tasks" />
            <Card className="divide-y divide-line p-0">
              {data.open.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] text-ink">{t.title}</p>
                    <p className={`text-[12px] ${t.deadline && t.deadline < todayKey() ? 'text-rose' : 'text-faint'}`}>
                      {data.projects.find((p) => p.id === t.projectId)?.name ?? 'No project'}{t.deadline ? `, due ${formatDay(t.deadline, 'd MMM')}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-mist px-2.5 py-1 text-[12px] font-semibold capitalize text-muted">{t.status.replace('_', ' ')}</span>
                </div>
              ))}
            </Card>
          </section>
        )}

        <section>
          <SectionHeader title="Work log this week" />
          {!data ? <Skeleton className="h-32" /> : data.logs.length === 0 ? (
            <EmptyState icon={Clock3} title="No work logged this week" body="Log time as you go. It counts toward the Work arc on Home, never toward personal study." />
          ) : (
            <Card className="divide-y divide-line p-0">
              {data.logs.map((l) => (
                <div key={l.id} className="flex items-center gap-3 py-3 pl-4 pr-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] text-ink">{l.summary}</p>
                    <p className="text-[12px] text-faint">{l.date === todayKey() ? 'Today' : formatDay(l.date, 'EEE d MMM')}{l.isLearning ? ', learning' : ''}</p>
                  </div>
                  <p className="font-display tabular text-[15px] font-semibold text-indigo">{formatMinutes(l.minutes)}</p>
                  <button aria-label="Delete log" onClick={async () => { await db.company_work_logs.delete(l.id); toast.show('Log deleted') }}
                    className="grid h-10 w-10 place-items-center rounded-full text-faint hover:bg-mist hover:text-rose"><Trash2 size={16} /></button>
                </div>
              ))}
            </Card>
          )}
        </section>
      </div>
      <WorkLogSheet open={open} onClose={() => setOpen(false)} projects={data?.projects.filter((p) => p.status === 'active') ?? []} />
    </>
  )
}
