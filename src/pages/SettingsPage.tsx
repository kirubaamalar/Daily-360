import { ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionHeader } from '@/components/ui/Card'
import { PreferencesForm } from '@/features/settings/PreferencesForm'
import { DataManagement } from '@/features/settings/DataManagement'

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Preferences, targets, and your data" />
      <div className="space-y-8 px-4">
        <PreferencesForm />
        <section>
          <SectionHeader title="Your data" />
          <DataManagement />
        </section>
        <section className="flex gap-3 rounded-card bg-ink px-4 py-4 text-[13px] leading-relaxed text-[#c3c8e4]">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-[#aab0ff]" />
          <p>
            Daily360 has no account, no server, and no sync. Data is stored in this browser’s IndexedDB on this device only and is not encrypted or password protected.
            Anyone with access to this phone’s browser can read it. Keep regular backups.
          </p>
        </section>
        <p className="pb-2 text-center text-[12px] text-faint">Daily360 version {__APP_VERSION__}</p>
      </div>
    </>
  )
}
