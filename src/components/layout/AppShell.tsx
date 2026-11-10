import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { BottomNav } from './BottomNav'
import { Toaster } from '@/components/ui/Toaster'
import { UpdatePrompt } from './UpdatePrompt'
import { ReminderOverlay } from '@/features/reminders/ReminderOverlay'

export function AppShell() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0 }) }, [pathname])
  return (
    <div className="mx-auto min-h-dvh max-w-[430px] bg-mist">
      <main key={pathname} className="animate-page-in pb-[112px]">
        <Outlet />
      </main>
      <BottomNav />
      <Toaster />
      <UpdatePrompt />
      <ReminderOverlay />
    </div>
  )
}
