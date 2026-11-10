import { cn } from '@/utils/cn'

/** 1–5 self-report picker with words, not scores, so it reads as a feeling rather than a grade. */
export function RatingPicker({ value, onChange, labels, name }: {
  value?: number; onChange: (v: number | undefined) => void; labels: [string, string, string, string, string]; name: string
}) {
  return (
    <div role="radiogroup" aria-label={name} className="grid grid-cols-5 gap-1.5">
      {labels.map((l, i) => {
        const v = i + 1
        const on = value === v
        return (
          <button key={l} type="button" role="radio" aria-checked={on} onClick={() => onChange(on ? undefined : v)}
            className={cn('flex h-14 flex-col items-center justify-center rounded-[12px] border text-[11px] font-semibold leading-tight transition-colors',
              on ? 'border-indigo bg-indigo text-white' : 'border-line bg-paper text-muted')}>
            <span className="font-display text-[15px]">{v}</span>
            <span className="mt-0.5 px-0.5">{l}</span>
          </button>
        )
      })}
    </div>
  )
}
