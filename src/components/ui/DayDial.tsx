import { cn } from '@/utils/cn'

export interface DialSegment {
  key: string
  label: string
  /** 0–1 */
  value: number
  color: string
}

/**
 * The Daily360 dial: the day as a full 360° ring split into equal arcs,
 * one per area of focus. Each arc fills toward its own target.
 */
export function DayDial({ segments, size = 196, children, className }: {
  segments: DialSegment[]; size?: number; children?: React.ReactNode; className?: string
}) {
  const stroke = 14
  const r = (size - stroke) / 2 - 2
  const c = size / 2
  const gapDeg = 9
  const span = 360 / segments.length

  const arc = (startDeg: number, sweep: number) => {
    if (sweep <= 0.1) return ''
    const toXY = (deg: number) => {
      const rad = ((deg - 90) * Math.PI) / 180
      return [c + r * Math.cos(rad), c + r * Math.sin(rad)]
    }
    const [x1, y1] = toXY(startDeg)
    const [x2, y2] = toXY(startDeg + sweep)
    return `M ${x1} ${y1} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${x2} ${y2}`
  }

  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
        aria-label={segments.map((s) => `${s.label} ${Math.round(s.value * 100)}%`).join(', ')}>
        {/* minute ticks around the outside give the dial its instrument feel */}
        {Array.from({ length: 72 }).map((_, i) => {
          const rad = ((i * 5 - 90) * Math.PI) / 180
          const r1 = r + stroke / 2 + 4
          const r2 = r1 + (i % 6 === 0 ? 5 : 2.5)
          return <line key={i} x1={c + r1 * Math.cos(rad)} y1={c + r1 * Math.sin(rad)} x2={c + r2 * Math.cos(rad)} y2={c + r2 * Math.sin(rad)}
            stroke="rgb(255 255 255 / 0.22)" strokeWidth={1} />
        })}
        {segments.map((s, i) => {
          const start = i * span + gapDeg / 2
          const full = span - gapDeg
          const v = Math.max(0, Math.min(1, s.value))
          return (
            <g key={s.key}>
              <path d={arc(start, full)} stroke="rgb(255 255 255 / 0.12)" strokeWidth={stroke} fill="none" strokeLinecap="round" />
              {v > 0 && (
                <path d={arc(start, Math.max(full * v, 1))} stroke={s.color} strokeWidth={stroke} fill="none" strokeLinecap="round"
                  className="transition-all duration-700" />
              )}
            </g>
          )
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}
