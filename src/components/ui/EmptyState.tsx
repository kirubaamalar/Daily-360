import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-line bg-paper/60 px-6 py-8 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-indigo-soft text-indigo"><Icon size={22} /></div>
      <p className="font-display text-[16px] font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-[260px] text-sm leading-relaxed text-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
