import { cn } from '@/utils/cn'
export function ProgressBar({ value, className, tone = 'bg-indigo' }: { value: number; className?: string; tone?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-line', className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full transition-[width] duration-500', tone)} style={{ width: `${pct}%` }} />
    </div>
  )
}
