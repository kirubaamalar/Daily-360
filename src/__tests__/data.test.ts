import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/database/db'
import { calculateProductivity } from '@/features/analytics/productivity'
import { createBackup, parseBackup, resetAllData, restoreBackup } from '@/services/backupService'
import { toCsv } from '@/services/csvService'
import { loadSampleData, removeSampleData } from '@/services/sampleDataService'
import { financeRepo } from '@/services/repositories/financeRepo'
import { wellnessRepo } from '@/services/repositories/wellnessRepo'
import { studyRepo } from '@/services/repositories/studyRepo'
import { habitRepo } from '@/services/repositories/habitRepo'
import { loadSettings, saveSettings } from '@/services/settingsService'
import { DEFAULT_SETTINGS } from '@/types/models'
import { sumMoney } from '@/utils/currency'
import { formatMinutes, todayKey } from '@/utils/date'

beforeEach(async () => { await resetAllData() })

describe('productivity', () => {
  const base = { studyMinutes: 60, tasksDone: 1, tasksPlanned: 2, habitsDone: 2, habitsDue: 4, companyMinutes: 240 }
  it('weights capped ratios', () => {
    const r = calculateProductivity(base, DEFAULT_SETTINGS.targets, DEFAULT_SETTINGS.weights)
    // study 60/120=.5, tasks .5, habits .5, work 240/480=.5 → 50
    expect(r.score).toBe(50)
  })
  it('caps above-target work at 100%', () => {
    const r = calculateProductivity({ ...base, studyMinutes: 999 }, DEFAULT_SETTINGS.targets, DEFAULT_SETTINGS.weights)
    expect(r.components.find((c) => c.key === 'study')!.ratio).toBe(1)
  })
  it('skips areas without a target and returns null when nothing counts', () => {
    const r = calculateProductivity({ ...base, habitsDue: 0 }, DEFAULT_SETTINGS.targets, DEFAULT_SETTINGS.weights)
    expect(r.score).toBe(50)
    const none = calculateProductivity(base, DEFAULT_SETTINGS.targets, { study: 0, personalTasks: 0, habits: 0, companyWork: 0 })
    expect(none.score).toBeNull()
  })
})

describe('utils', () => {
  it('sums money without float drift', () => expect(sumMoney([0.1, 0.2])).toBe(0.3))
  it('formats minutes', () => { expect(formatMinutes(135)).toBe('2h 15m'); expect(formatMinutes(45)).toBe('45m'); expect(formatMinutes(60)).toBe('1h') })
  it('escapes CSV and blocks formula injection', () => {
    expect(toCsv(['a'], [['x,"y"'], ['=SUM(A1)'], [-50]])).toBe('a\r\n"x,""y"""\r\n\'=SUM(A1)\r\n-50')
  })
})

describe('repositories', () => {
  it('expense CRUD keeps company separate', async () => {
    await financeRepo.addExpense({ date: todayKey(), amount: 120, category: 'Food', kind: 'regular', scope: 'personal' })
    await financeRepo.addExpense({ date: todayKey(), amount: 900, category: 'Travel', kind: 'regular', scope: 'company' })
    const personal = await db.expenses.where('[scope+date]').equals(['personal', todayKey()]).toArray()
    expect(personal).toHaveLength(1)
    await financeRepo.updateExpense(personal[0].id, { amount: 150 })
    expect((await db.expenses.get(personal[0].id))!.amount).toBe(150)
    await financeRepo.deleteExpense(personal[0].id)
    expect(await db.expenses.count()).toBe(1)
  })
  it('wellness keeps one log per day and accumulates water', async () => {
    await wellnessRepo.upsert(todayKey(), { sleepHours: 7 })
    await wellnessRepo.addWater(todayKey(), 250)
    await wellnessRepo.addWater(todayKey(), 250)
    const logs = await db.wellness_logs.toArray()
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({ sleepHours: 7, waterMl: 500 })
  })
  it('study timer allows one running session and records duration', async () => {
    const s = await studyRepo.addSubject('Java')
    const sess = await studyRepo.start(s.id)
    await expect(studyRepo.start(s.id)).rejects.toThrow()
    await db.study_sessions.update(sess.id, { startedAt: new Date(Date.now() - 25 * 60000).toISOString() })
    expect(await studyRepo.stop(sess.id)).toBe(25)
    expect(await studyRepo.activeSession()).toBeUndefined()
  })
  it('habit cycle: done → missed → cleared', async () => {
    await habitRepo.cycle('h1', todayKey())
    expect((await db.habit_logs.toArray())[0].status).toBe('done')
    await habitRepo.cycle('h1', todayKey())
    expect((await db.habit_logs.toArray())[0].status).toBe('missed')
    await habitRepo.cycle('h1', todayKey())
    expect(await db.habit_logs.count()).toBe(0)
  })
})

describe('settings, backup, sample data', () => {
  it('creates and merges settings', async () => {
    expect((await loadSettings()).currency).toBe('INR')
    await saveSettings({ displayName: 'Arun' })
    expect((await loadSettings()).displayName).toBe('Arun')
  })
  it('backup → reset → restore round-trips every table', async () => {
    await loadSampleData(7)
    await financeRepo.addExpense({ date: todayKey(), amount: 42, category: 'Other', kind: 'regular', scope: 'personal' })
    const before = await createBackup()
    const json = JSON.stringify(before)
    await resetAllData()
    expect(await db.expenses.count()).toBe(0)
    await restoreBackup(parseBackup(json))
    const after = await createBackup()
    for (const t of Object.keys(before.tables)) expect(after.tables[t].length).toBe(before.tables[t].length)
  })
  it('rejects invalid backups without touching data', async () => {
    await financeRepo.addExpense({ date: todayKey(), amount: 1, category: 'Other', kind: 'regular', scope: 'personal' })
    expect(() => parseBackup('nope')).toThrow(/not valid JSON/)
    expect(() => parseBackup('{"app":"Other"}')).toThrow(/not a Daily360 backup/)
    expect(await db.expenses.count()).toBe(1)
  })
  it('removing sample data keeps real records', async () => {
    await financeRepo.addExpense({ date: todayKey(), amount: 99, category: 'Food', kind: 'regular', scope: 'personal' })
    await loadSampleData(7)
    expect(await db.expenses.count()).toBeGreaterThan(1)
    await removeSampleData()
    const left = await db.expenses.toArray()
    expect(left).toHaveLength(1)
    expect(left[0].amount).toBe(99)
  })
})

describe('monthly balance', async () => {
  const { summariseMonth, recentMonths, shiftMonth } = await import('@/features/finance/monthlySummary')
  const mk = (date: string, amount: number, kind = 'regular') => ({ id: date + amount, createdAt: '', updatedAt: '', date, amount, kind, category: 'Food', scope: 'personal' }) as never
  const inc = (date: string, amount: number) => ({ id: date, createdAt: '', updatedAt: '', date, amount, source: 'Salary', scope: 'personal' }) as never
  it('income − expenses = balance, per month', () => {
    const ex = [mk('2026-11-02', 220), mk('2026-11-03', 150), mk('2026-11-05', 6200, 'emi'), mk('2026-10-30', 999)]
    const s = summariseMonth('2026-11', ex, [inc('2026-11-01', 5000.5)])
    expect(s).toMatchObject({ income: 5000.5, spending: 370, commitments: 6200, expenses: 6570, balance: -1569.5, count: 4 })
  })
  it('reports null kept % without income', () => {
    expect(summariseMonth('2026-11', [mk('2026-11-02', 10)], []).keptPercent).toBeNull()
  })
  it('walks months across year boundaries', () => {
    expect(recentMonths('2026-02', 3)).toEqual(['2026-02', '2026-01', '2025-12'])
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
  })
})
