import { cn } from '@/utils/cn'

interface Option<T extends string> { value: T; label: string }

export function Segmented<T extends string>({ options, value, onChange, className, label }: {
  options: Option<T>[]; value: T; onChange: (v: T) => void; className?: string; label: string
}) {
  return (
    <div role="tablist" aria-label={label} className={cn('flex rounded-[16px] bg-line/60 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-10 flex-1 rounded-[12px] text-[14px] font-semibold transition-all',
            value === o.value ? 'bg-paper text-ink shadow-card' : 'text-muted',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
