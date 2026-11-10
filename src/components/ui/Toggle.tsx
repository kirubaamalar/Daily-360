import { cn } from '@/utils/cn'

export function Toggle({ checked, onChange, label, description, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean
}) {
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 text-left disabled:opacity-50">
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] leading-relaxed text-muted">{description}</span>}
      </span>
      <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-indigo' : 'bg-line')}>
        <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-6' : 'translate-x-1')} />
      </span>
    </button>
  )
}
