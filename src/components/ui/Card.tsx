import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-card bg-paper p-4 shadow-card', className)} {...props} />
}

/** Section title + optional trailing action. Sentence case, no eyebrow labels. */
export function SectionHeader({ title, action, className }: { title: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-3 flex items-center justify-between px-1', className)}>
      <h2 className="font-display text-[17px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
      {action}
    </div>
  )
}
