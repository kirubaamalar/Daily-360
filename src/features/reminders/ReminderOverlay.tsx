import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { wellnessRepo } from '@/services/repositories/wellnessRepo'
import { useSettingsStore } from '@/stores/settingsStore'
import { toast } from '@/stores/toastStore'
import { todayKey } from '@/utils/date'
import type { ReminderKind } from '@/types/models'
import { cn } from '@/utils/cn'

const SNOOZE_MIN = 15

/**
 * The animated in-app reminder: Drip (water) or Luna (sleep) pops up with a speech bubble.
 * Shown when a reminder push arrives while the app is on screen, or when the user opens
 * the app from a reminder notification (?reminder=water|sleep).
 */
export function ReminderOverlay() {
  const { settings } = useSettingsStore()
  const [kind, setKind] = useState<ReminderKind | null>(null)
  const [phase, setPhase] = useState<'in' | 'celebrate' | 'out'>('in')
  const localSnooze = useRef<ReturnType<typeof setTimeout>>(undefined)

  const show = useCallback((k: ReminderKind) => { setPhase('in'); setKind(k) }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const r = params.get('reminder')
    if (r === 'water' || r === 'sleep') {
      show(r)
      params.delete('reminder')
      history.replaceState(null, '', location.pathname + (params.size ? `?${params}` : '') + location.hash)
    }
    const onMessage = async (e: MessageEvent) => {
      if (e.data?.type === 'daily360-reminder' && (e.data.kind === 'water' || e.data.kind === 'sleep')) show(e.data.kind)
      if (e.data?.type === 'daily360-add-water') {
        const total = await wellnessRepo.addWater(todayKey(), Number(e.data.ml) || 250)
        toast.success(`Logged 250 ml, ${(total / 1000).toFixed(2).replace(/0$/, '')} L today`)
      }
    }
    navigator.serviceWorker?.addEventListener('message', onMessage)
    return () => {
      navigator.serviceWorker?.removeEventListener('message', onMessage)
      clearTimeout(localSnooze.current)
    }
  }, [show])

  const close = () => {
    setPhase('out')
    setTimeout(() => setKind(null), 380)
  }

  const yes = async () => {
    setPhase('celebrate')
    await wellnessRepo.addWater(todayKey(), 250)
    setTimeout(close, 1300)
  }

  const later = async () => {
    const k = kind!
    close()
    if (settings.pushEndpoint) {
      const ok = await fetch('/api/push/snooze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: settings.pushEndpoint, kind: k, minutes: SNOOZE_MIN }),
      }).then((r) => r.ok).catch(() => false)
      if (ok) return toast.show(`I’ll remind you again in ${SNOOZE_MIN} minutes`)
    }
    // Offline or reminders off: remind again only while the app stays open.
    clearTimeout(localSnooze.current)
    localSnooze.current = setTimeout(() => show(k), SNOOZE_MIN * 60_000)
    toast.show(`I’ll remind you in ${SNOOZE_MIN} minutes if the app stays open`)
  }

  if (!kind) return null
  const name = settings.displayName
  const water = kind === 'water'
  const line = water
    ? (name ? `Hey ${name}, did you drink water?` : 'Did you drink water?')
    : (name ? `It’s time to sleep, ${name}.` : 'It’s time to sleep.')

  return createPortal(
    <div className="fixed inset-0 z-[75] mx-auto flex max-w-[430px] flex-col justify-end" role="dialog" aria-modal="true" aria-label={line}>
      <div className={cn('absolute inset-0 transition-opacity duration-300', water ? 'bg-ink/35' : 'bg-ink/70', phase === 'out' && 'opacity-0')} onClick={close} aria-hidden />

      <div className={cn('relative px-5 pb-[max(env(safe-area-inset-bottom),20px)]', phase === 'out' && 'animate-mascot-out')}>
        <div className="animate-bubble-pop relative mx-auto mb-1 max-w-[330px] rounded-[26px] bg-paper px-5 py-4 text-center shadow-float">
          <p className="font-display text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink">
            {phase === 'celebrate' ? 'Nice! Logged 250 ml 💧' : line}
          </p>
          {phase !== 'celebrate' && (
            <p className="mt-1 text-[14px] text-muted">{water ? 'A glass now keeps the afternoon slump away.' : 'Put the phone down and rest well.'}</p>
          )}
          <span className="absolute -bottom-2 left-1/2 h-5 w-5 -translate-x-1/2 rotate-45 rounded-[4px] bg-paper" aria-hidden />
        </div>

        <div className="relative mx-auto h-[220px] w-[204px]">
          <img src={water ? '/reminders/water.svg' : '/reminders/sleep.svg'} alt="" draggable={false}
            className={cn('animate-mascot-in h-full w-full select-none', phase === 'celebrate' && 'animate-mascot-hop')} />
          {phase === 'celebrate' && (
            <span className="animate-float-up font-display absolute -right-6 top-[45%] rounded-full bg-sky px-3 py-1 text-[15px] font-semibold text-white">+250 ml</span>
          )}
        </div>

        <div className={cn('grid grid-cols-2 gap-3 transition-opacity', phase === 'celebrate' && 'pointer-events-none opacity-0')}>
          {water ? (
            <>
              <Button size="lg" className="bg-paper text-ink hover:bg-mist" onClick={later}>Remind me later</Button>
              <Button size="lg" className="bg-sky hover:bg-[#2675aa]" onClick={yes}>YES</Button>
            </>
          ) : (
            <>
              <Button size="lg" className="bg-paper text-ink hover:bg-mist" onClick={later}>15 more minutes</Button>
              <Button size="lg" onClick={() => { close(); toast.show('Sleep well 🌙') }}>Good night</Button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
