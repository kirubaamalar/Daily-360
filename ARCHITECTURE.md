# Daily360 architecture

## Principles

- Frontend only. All reads and writes go through Dexie to IndexedDB.
- Business logic lives in `services/` and `features/*/*.ts`; components only render and call them.
- Screens read data with `useLiveQuery`, so every view updates the moment a record changes.
- Sample data is flagged `isSample: true`, shown with a banner and badges, and removable without touching real entries.
- Productivity and wellness are never combined. The productivity formula is in `features/analytics/productivity.ts` and explained on the Analytics screen.

## Reminder service

The only server-side code is `worker/` (Cloudflare Worker + one Durable Object):

- `worker/schedule.ts`: pure reminder rules (shared with the app and tested)
- `worker/webpush.ts`: VAPID-signed, payload-free Web Push using WebCrypto
- `worker/index.ts`: `/api/push/*` endpoints and the 15-minute cron trigger
- `public/push-sw.js`: imported by the service worker; shows notifications and handles YES / Remind me later
- `src/features/reminders/`: Settings section and the animated in-app reminder (Drip and Luna)

## Folder structure

```
src/
  app/            App root, router, error boundary
  assets/         Static assets bundled by Vite
  components/
    layout/       AppShell, BottomNav, PageHeader, UpdatePrompt (PWA)
    ui/           Button, Card, Field/Input/Select/Textarea, Sheet, ConfirmDialog,
                  Segmented, ProgressBar, RatingPicker, DayDial, EmptyState, Skeleton, Toaster
  database/       db.ts: Dexie schema, versions, table list for backup
  features/
    analytics/    productivity.ts (pure calc), useRangeSeries.ts
    company/      WorkLogSheet
    dashboard/    useTodayData.ts, TaskSheet
    finance/      schemas.ts (Zod), TransactionSheet
    habits/       (phase 5)
    settings/     PreferencesForm, DataManagement
    study/        StartStudySheet, ActiveSessionCard
    wellness/     WellnessSheet
  hooks/          useDataPresence
  pages/          Home, Personal, Company, Analytics, Settings
  services/
    repositories/ financeRepo, taskRepo, wellnessRepo, studyRepo, habitRepo
    backupService, csvService, sampleDataService, settingsService, download
  stores/         Zustand: settingsStore, toastStore
  types/          models.ts: every record type and default settings
  utils/          cn, id, date, currency
  __tests__/      Vitest + fake-indexeddb
```

## Data model

17 tables, all keyed by UUID `id`, with `createdAt` / `updatedAt` ISO timestamps. Days are stored as `yyyy-MM-dd` in local time and months as `yyyy-MM`, so range queries are plain string comparisons.

| Table | Key indexes | Relationships |
|---|---|---|
| expenses | date, category, kind, scope, [scope+date] | kind: regular, emi, loan, savings |
| income | date, scope, [scope+date] | |
| budgets | month, unique [month+category] | category or "Overall" |
| study_subjects | name | |
| study_topics | subjectId, status, revisionDate | → study_subjects |
| study_sessions | subjectId, topicId, date, startedAt | running while endedAt is empty |
| study_goals | subjectId, period | optional → study_subjects |
| habits | frequency, order | |
| habit_logs | habitId, date, unique [habitId+date] | → habits |
| wellness_logs | unique date | one per day |
| daily_tasks | date | personal only |
| company_projects | status, deadline | |
| company_tasks | projectId, status, deadline | → company_projects |
| company_work_logs | date, projectId, taskId | → projects, tasks |
| meeting_notes | date, projectId | → company_projects |
| daily_reviews | unique date | |
| app_settings | id = "app" | single row |

Company money is separated by `scope`. Personal screens query `[scope+date]` with `personal`, so company entries can never leak into personal totals. Company entry is off unless enabled in Settings.

Migrations: never edit a shipped `version()` block. Add `version(n+1)` with the full store map and an `upgrade()` that transforms existing rows. Backups carry `schemaVersion`, and restore rejects files from a newer version.

## Build phases

| Phase | Scope | Status |
|---|---|---|
| 1 | Scaffold, Vite, Tailwind, TypeScript paths, folder structure | Done |
| 2 | Design system, bottom navigation, app shell | Done |
| 3 | Dexie database (17 tables), types, repositories, settings | Done |
| 3b | Home dashboard, quick actions, Settings and data management, PWA | Done |
| 3c | Month-wise balance, menu crash fix | Done |
| 3d | Water and bedtime reminders with notifications and animated mascots | Done |
| 4 | Finance: edit transactions, budgets, loans and EMI view | Next |
| 5 | Study: subjects, topics, goals, revision dates, subject-wise charts | |
| 6 | Habits: create, edit, archive, weekly and monthly habits, streaks, calendar | |
| 7 | Wellness: trends for sleep, weight, mood, energy; journal view | |
| 8 | Company: projects, tasks, meeting notes, weekly summary | |
| 9 | Analytics: weekly and monthly reports, habit consistency, budget analysis | |
| 10 | Daily review, end-to-end tests, Lighthouse PWA audit | |
