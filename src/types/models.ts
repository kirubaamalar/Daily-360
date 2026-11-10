/**
 * Daily360 data models. Every persisted record extends BaseRecord.
 * Day keys are ISO calendar dates ("yyyy-MM-dd") in the user's local time,
 * month keys are "yyyy-MM". Timestamps are full ISO strings.
 */
export type ID = string
export type DayKey = string
export type MonthKey = string

export interface BaseRecord {
  id: ID
  createdAt: string
  updatedAt: string
  /** True only for records created by "Load sample data". Removable in Settings. */
  isSample?: boolean
}

/* ---------- Finance ---------- */
export const EXPENSE_CATEGORIES = [
  'Food', 'Petrol', 'Travel', 'Shopping', 'Bills', 'Health',
  'Education', 'Entertainment', 'Family', 'Other',
] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

/** regular spend, EMI instalment, loan repayment, or money moved into savings */
export type ExpenseKind = 'regular' | 'emi' | 'loan' | 'savings'
/** Company expenses only exist when the user enables them in Settings. */
export type Scope = 'personal' | 'company'

export interface Expense extends BaseRecord {
  date: DayKey
  amount: number
  category: ExpenseCategory
  kind: ExpenseKind
  scope: Scope
  note?: string
  paymentMethod?: string
  /** EMI / loan label, e.g. "Bike loan" */
  reference?: string
}

export interface Income extends BaseRecord {
  date: DayKey
  amount: number
  source: string
  scope: Scope
  note?: string
}

export interface Budget extends BaseRecord {
  month: MonthKey
  /** 'Overall' is the monthly total limit */
  category: ExpenseCategory | 'Overall'
  limit: number
}

/* ---------- Study ---------- */
export interface StudySubject extends BaseRecord {
  name: string
  color: string
  archived: boolean
}

export type TopicStatus = 'pending' | 'in_progress' | 'completed'
export interface StudyTopic extends BaseRecord {
  subjectId: ID
  title: string
  status: TopicStatus
  notes?: string
  revisionDate?: DayKey
  completedAt?: string
}

export interface StudySession extends BaseRecord {
  subjectId: ID
  topicId?: ID
  date: DayKey
  startedAt: string
  /** undefined while the timer is running */
  endedAt?: string
  durationMinutes: number
  note?: string
}

export type GoalPeriod = 'daily' | 'weekly' | 'monthly'
export interface StudyGoal extends BaseRecord {
  /** undefined = all subjects */
  subjectId?: ID
  period: GoalPeriod
  targetMinutes: number
  active: boolean
}

/* ---------- Habits ---------- */
export type HabitFrequency = 'daily' | 'weekly' | 'monthly'
export interface Habit extends BaseRecord {
  name: string
  icon: string
  frequency: HabitFrequency
  /** completions required per period (weekly/monthly); 1 for daily */
  targetCount: number
  archived: boolean
  order: number
}

export type HabitStatus = 'done' | 'missed'
export interface HabitLog extends BaseRecord {
  habitId: ID
  date: DayKey
  status: HabitStatus
}

/* ---------- Wellness ---------- */
export interface WellnessLog extends BaseRecord {
  /** one log per day */
  date: DayKey
  sleepHours?: number
  /** 1–5, self-reported */
  sleepQuality?: number
  waterMl?: number
  exerciseMinutes?: number
  walkingMinutes?: number
  weightKg?: number
  /** 1–5, self-reported */
  mood?: number
  /** 1–5, self-reported */
  energy?: number
  journal?: string
}

/* ---------- Personal daily tasks ---------- */
export type Priority = 'low' | 'medium' | 'high'
export interface DailyTask extends BaseRecord {
  date: DayKey
  title: string
  done: boolean
  priority: Priority
  completedAt?: string
}

/* ---------- Company ---------- */
export type ProjectStatus = 'active' | 'on_hold' | 'completed'
export interface CompanyProject extends BaseRecord {
  name: string
  client?: string
  status: ProjectStatus
  color: string
  deadline?: DayKey
  description?: string
}

export type WorkTaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done'
export interface CompanyTask extends BaseRecord {
  projectId?: ID
  title: string
  status: WorkTaskStatus
  priority: Priority
  deadline?: DayKey
  notes?: string
  completedAt?: string
}

export interface CompanyWorkLog extends BaseRecord {
  date: DayKey
  projectId?: ID
  taskId?: ID
  minutes: number
  summary: string
  /** marks work-related learning entries */
  isLearning: boolean
}

export interface MeetingNote extends BaseRecord {
  date: DayKey
  title: string
  projectId?: ID
  attendees?: string
  notes: string
  actionItems?: string
}

/* ---------- Reviews ---------- */
export interface DailyReview extends BaseRecord {
  date: DayKey
  wentWell?: string
  improve?: string
  tomorrowFocus?: string
  /** 1–5 self rating of the day */
  rating?: number
}

/* ---------- Settings ---------- */
export interface DailyTargets {
  studyMinutes: number
  waterMl: number
  sleepHours: number
  companyWorkMinutes: number
  personalTasks: number
}

/**
 * Productivity score weights (0–100 each, normalised at calculation time).
 * Deliberately excludes every wellness metric.
 */
export interface ProductivityWeights {
  study: number
  personalTasks: number
  habits: number
  companyWork: number
}

export interface AppSettings {
  id: 'app'
  displayName: string
  currency: string
  locale: string
  dateFormat: 'dd MMM yyyy' | 'dd/MM/yyyy' | 'MM/dd/yyyy' | 'yyyy-MM-dd'
  weekStartsOn: 0 | 1
  targets: DailyTargets
  weights: ProductivityWeights
  allowCompanyExpenses: boolean
  lastBackupAt?: string
  updatedAt: string
}

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'app',
  displayName: '',
  currency: 'INR',
  locale: 'en-IN',
  dateFormat: 'dd MMM yyyy',
  weekStartsOn: 1,
  targets: {
    studyMinutes: 120,
    waterMl: 2500,
    sleepHours: 7.5,
    companyWorkMinutes: 480,
    personalTasks: 3,
  },
  weights: { study: 30, personalTasks: 25, habits: 25, companyWork: 20 },
  allowCompanyExpenses: false,
  updatedAt: new Date(0).toISOString(),
}
