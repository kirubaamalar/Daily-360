import Dexie, { type EntityTable } from 'dexie'
import type {
  AppSettings, Budget, CompanyProject, CompanyTask, CompanyWorkLog, DailyReview,
  DailyTask, Expense, Habit, HabitLog, Income, MeetingNote, StudyGoal, StudySession,
  StudySubject, StudyTopic, WellnessLog,
} from '@/types/models'

/**
 * Daily360 IndexedDB database.
 *
 * Versioning rules:
 *  - Never edit an existing version() block once it has shipped.
 *  - Add a new version(n + 1) with the full store map and an optional upgrade().
 *  - Index only fields used in where()/orderBy(); everything else is stored unindexed.
 */
export class Daily360DB extends Dexie {
  expenses!: EntityTable<Expense, 'id'>
  income!: EntityTable<Income, 'id'>
  budgets!: EntityTable<Budget, 'id'>
  study_subjects!: EntityTable<StudySubject, 'id'>
  study_topics!: EntityTable<StudyTopic, 'id'>
  study_sessions!: EntityTable<StudySession, 'id'>
  study_goals!: EntityTable<StudyGoal, 'id'>
  habits!: EntityTable<Habit, 'id'>
  habit_logs!: EntityTable<HabitLog, 'id'>
  wellness_logs!: EntityTable<WellnessLog, 'id'>
  daily_tasks!: EntityTable<DailyTask, 'id'>
  company_projects!: EntityTable<CompanyProject, 'id'>
  company_tasks!: EntityTable<CompanyTask, 'id'>
  company_work_logs!: EntityTable<CompanyWorkLog, 'id'>
  meeting_notes!: EntityTable<MeetingNote, 'id'>
  daily_reviews!: EntityTable<DailyReview, 'id'>
  app_settings!: EntityTable<AppSettings, 'id'>

  constructor() {
    super('daily360')

    this.version(1).stores({
      expenses: 'id, date, category, kind, scope, [scope+date]',
      income: 'id, date, scope, [scope+date]',
      budgets: 'id, month, &[month+category]',
      study_subjects: 'id, name',
      study_topics: 'id, subjectId, status, revisionDate',
      study_sessions: 'id, subjectId, topicId, date, startedAt',
      study_goals: 'id, subjectId, period',
      habits: 'id, frequency, order',
      habit_logs: 'id, habitId, date, &[habitId+date]',
      wellness_logs: 'id, &date',
      daily_tasks: 'id, date',
      company_projects: 'id, status, deadline',
      company_tasks: 'id, projectId, status, deadline',
      company_work_logs: 'id, date, projectId, taskId',
      meeting_notes: 'id, date, projectId',
      daily_reviews: 'id, &date',
      app_settings: 'id',
    })
  }
}

export const db = new Daily360DB()

/** Tables included in backup/restore, in dependency-safe order. */
export const DATA_TABLES = [
  'expenses', 'income', 'budgets',
  'study_subjects', 'study_topics', 'study_sessions', 'study_goals',
  'habits', 'habit_logs', 'wellness_logs', 'daily_tasks',
  'company_projects', 'company_tasks', 'company_work_logs', 'meeting_notes',
  'daily_reviews', 'app_settings',
] as const
export type DataTableName = (typeof DATA_TABLES)[number]
