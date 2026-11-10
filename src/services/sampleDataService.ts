import { addDays } from 'date-fns'
import { db, DATA_TABLES } from '@/database/db'
import { stamp } from '@/utils/id'
import { toDayKey, toMonthKey } from '@/utils/date'
import type {
  CompanyProject, CompanyTask, CompanyWorkLog, DailyTask, Expense, ExpenseCategory, Habit,
  HabitLog, Income, StudySession, StudySubject, StudyTopic, WellnessLog, Budget,
} from '@/types/models'

/**
 * Demo records for exploring the app. Every record is flagged isSample = true
 * and can be removed with removeSampleData() without touching real entries.
 * Values come from a seeded generator so the demo is reproducible.
 */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

export async function hasSampleData() {
  for (const t of DATA_TABLES) {
    if (t === 'app_settings') continue
    const n = await db.table(t).filter((r: { isSample?: boolean }) => r.isSample === true).count()
    if (n) return true
  }
  return false
}

export async function loadSampleData(days = 21) {
  const r = rng(360)
  const today = new Date()
  const S = true

  const subjects: StudySubject[] = [
    ['Java', '#C2410C'], ['Spring Boot', '#3F8F5F'], ['React', '#2F7DB8'], ['SQL', '#7A5AC8'],
  ].map(([name, color]) => stamp({ name, color, archived: false }, S))

  const topics: StudyTopic[] = [
    [0, 'Streams and collectors', 'completed'], [0, 'Concurrency basics', 'in_progress'],
    [1, 'Spring Data JPA', 'in_progress'], [1, 'Security filters', 'pending'],
    [2, 'Server components', 'pending'], [2, 'Custom hooks', 'completed'],
    [3, 'Window functions', 'in_progress'],
  ].map(([s, title, status]) =>
    stamp({ subjectId: subjects[s as number].id, title: title as string, status: status as StudyTopic['status'],
      revisionDate: toDayKey(addDays(today, Math.floor(r() * 10) + 1)) }, S))

  const habits: Habit[] = [
    ['Morning walk', 'footprints'], ['Read 20 pages', 'book-open'], ['Wake by 6:30', 'sunrise'], ['No screens after 11', 'moon'],
  ].map(([name, icon], i) => stamp({ name, icon, frequency: 'daily' as const, targetCount: 1, archived: false, order: i }, S))

  const project: CompanyProject = stamp({ name: 'Billing revamp', client: 'Internal', status: 'active' as const,
    color: '#4C55C9', deadline: toDayKey(addDays(today, 18)) }, S)

  const companyTasks: CompanyTask[] = [
    ['Draft invoice API contract', 'done'], ['Migrate payment table', 'in_progress'], ['QA sign-off checklist', 'todo'],
  ].map(([title, status], i) => stamp({ projectId: project.id, title, status: status as CompanyTask['status'],
    priority: (['high', 'medium', 'low'] as const)[i], deadline: toDayKey(addDays(today, 3 + i * 4)) }, S))

  const expenses: Expense[] = []
  const income: Income[] = []
  const sessions: StudySession[] = []
  const habitLogs: HabitLog[] = []
  const wellness: WellnessLog[] = []
  const tasks: DailyTask[] = []
  const workLogs: CompanyWorkLog[] = []
  const cats: ExpenseCategory[] = ['Food', 'Petrol', 'Travel', 'Shopping', 'Bills', 'Entertainment', 'Health']

  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i)
    const date = toDayKey(d)
    const weekday = d.getDay() !== 0 && d.getDay() !== 6

    const n = 1 + Math.floor(r() * 3)
    for (let k = 0; k < n; k++) {
      const category = cats[Math.floor(r() * cats.length)]
      expenses.push(stamp({ date, category, kind: 'regular' as const, scope: 'personal' as const,
        amount: Math.round((80 + r() * (category === 'Bills' ? 1800 : 650)) / 10) * 10 }, S))
    }
    if (d.getDate() === 1) income.push(stamp({ date, amount: 85000, source: 'Salary', scope: 'personal' as const }, S))
    if (d.getDate() === 5) expenses.push(stamp({ date, amount: 6200, category: 'Bills' as const, kind: 'emi' as const,
      scope: 'personal' as const, reference: 'Bike loan EMI' }, S))

    const sub = subjects[Math.floor(r() * subjects.length)]
    if (r() > 0.2) {
      const mins = 25 + Math.floor(r() * 95)
      const start = new Date(d); start.setHours(20, 0, 0, 0)
      sessions.push(stamp({ subjectId: sub.id, date, startedAt: start.toISOString(),
        endedAt: new Date(start.getTime() + mins * 60000).toISOString(), durationMinutes: mins }, S))
    }

    habits.forEach((h) => {
      if (i === 0 && r() > 0.5) return // leave some of today open
      habitLogs.push(stamp({ habitId: h.id, date, status: r() > 0.28 ? 'done' as const : 'missed' as const }, S))
    })

    wellness.push(stamp({ date, sleepHours: Math.round((5.8 + r() * 2.4) * 4) / 4, sleepQuality: 2 + Math.floor(r() * 4),
      waterMl: i === 0 ? 1250 : 1500 + Math.floor(r() * 8) * 250, walkingMinutes: 15 + Math.floor(r() * 40),
      exerciseMinutes: r() > 0.5 ? 20 + Math.floor(r() * 30) : 0, weightKg: Math.round((72.4 - (days - i) * 0.04 + r() * 0.6) * 10) / 10,
      mood: 2 + Math.floor(r() * 4), energy: 2 + Math.floor(r() * 4) }, S))

    if (i <= 1) {
      ;['Pay electricity bill', 'Call parents', 'Plan weekend groceries'].forEach((title, k) =>
        tasks.push(stamp({ date, title, done: i === 1 || k === 0, priority: (['high', 'medium', 'low'] as const)[k] }, S)))
    }

    if (weekday) {
      workLogs.push(stamp({ date, projectId: project.id, minutes: 300 + Math.floor(r() * 8) * 30,
        summary: 'Billing revamp development', isLearning: false }, S))
    }
  }

  const budgets: Budget[] = [
    stamp({ month: toMonthKey(today), category: 'Overall' as const, limit: 40000 }, S),
    stamp({ month: toMonthKey(today), category: 'Food' as const, limit: 9000 }, S),
  ]

  await db.transaction('rw', DATA_TABLES.map((t) => db.table(t)), async () => {
    await db.study_subjects.bulkAdd(subjects)
    await db.study_topics.bulkAdd(topics)
    await db.study_sessions.bulkAdd(sessions)
    await db.habits.bulkAdd(habits)
    await db.habit_logs.bulkAdd(habitLogs)
    // A real wellness log for a date wins over sample data (date is unique).
    for (const w of wellness) if (!(await db.wellness_logs.where('date').equals(w.date).first())) await db.wellness_logs.add(w)
    await db.daily_tasks.bulkAdd(tasks)
    await db.expenses.bulkAdd(expenses)
    await db.income.bulkAdd(income)
    for (const b of budgets) if (!(await db.budgets.where({ month: b.month, category: b.category }).first())) await db.budgets.add(b)
    await db.company_projects.add(project)
    await db.company_tasks.bulkAdd(companyTasks)
    await db.company_work_logs.bulkAdd(workLogs)
  })
}

export async function removeSampleData() {
  let removed = 0
  await db.transaction('rw', DATA_TABLES.map((t) => db.table(t)), async () => {
    for (const t of DATA_TABLES) {
      if (t === 'app_settings') continue
      removed += await db.table(t).filter((r: { isSample?: boolean }) => r.isSample === true).delete()
    }
  })
  return removed
}
