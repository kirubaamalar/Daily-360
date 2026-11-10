import {
  addDays, eachDayOfInterval, endOfMonth, endOfWeek, format, parseISO,
  startOfMonth, startOfWeek,
} from 'date-fns'
import type { DayKey, MonthKey } from '@/types/models'

export const toDayKey = (d: Date = new Date()): DayKey => format(d, 'yyyy-MM-dd')
export const toMonthKey = (d: Date = new Date()): MonthKey => format(d, 'yyyy-MM')
export const fromDayKey = (k: DayKey): Date => parseISO(k)

export const todayKey = () => toDayKey(new Date())

export function weekRange(d: Date, weekStartsOn: 0 | 1) {
  return { start: toDayKey(startOfWeek(d, { weekStartsOn })), end: toDayKey(endOfWeek(d, { weekStartsOn })) }
}
export function monthRange(d: Date) {
  return { start: toDayKey(startOfMonth(d)), end: toDayKey(endOfMonth(d)) }
}
export function lastNDays(n: number, end: Date = new Date()): DayKey[] {
  return eachDayOfInterval({ start: addDays(end, -(n - 1)), end }).map(toDayKey)
}

export function greeting(d: Date = new Date()) {
  const h = d.getHours()
  if (h < 5) return 'Good night'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export function formatDay(k: DayKey, pattern: string) {
  return format(fromDayKey(k), pattern)
}

/** 135 → "2h 15m", 45 → "45m", 0 → "0m" */
export function formatMinutes(min: number) {
  const m = Math.max(0, Math.round(min))
  const h = Math.floor(m / 60)
  const r = m % 60
  if (!h) return `${r}m`
  return r ? `${h}h ${r}m` : `${h}h`
}
