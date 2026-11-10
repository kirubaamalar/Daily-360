import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Skeleton } from '@/components/ui/Skeleton'
import { useSettingsStore } from '@/stores/settingsStore'
import { ErrorBoundary } from './ErrorBoundary'
import HomePage from '@/pages/HomePage'

const PersonalPage = lazy(() => import('@/pages/PersonalPage'))
const CompanyPage = lazy(() => import('@/pages/CompanyPage'))
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))

function PageFallback() {
  return <div className="space-y-4 p-5 pt-8"><Skeleton className="h-9 w-40" /><Skeleton className="h-40" /><Skeleton className="h-28" /></div>
}

export default function App() {
  const { ready, error, init } = useSettingsStore()
  useEffect(() => { init() }, [init])

  if (!ready) return <div className="min-h-dvh bg-ink" aria-busy="true" />
  if (error) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col justify-center p-8">
        <h1 className="font-display text-2xl font-semibold text-ink">Storage is unavailable</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Daily360 saves everything in this browser’s local database, which is blocked right now. Private browsing modes often block it. Open Daily360 in a normal tab and try again.
        </p>
        <p className="mt-4 text-[12px] text-faint">{error}</p>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<HomePage />} />
              <Route path="personal" element={<PersonalPage />} />
              <Route path="company" element={<CompanyPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
