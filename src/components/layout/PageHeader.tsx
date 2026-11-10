import type { ReactNode } from 'react'

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="safe-top flex items-end justify-between gap-3 px-5 pb-4 pt-6">
      <div>
        <h1 className="font-display text-[30px] font-semibold leading-none tracking-[-0.03em] text-ink">{title}</h1>
        {subtitle && <p className="mt-2 text-[14px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}
