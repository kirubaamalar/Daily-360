import { useEffect, useState } from 'react'
import { BellOff, BellRing, Send } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { Toggle } from '@/components/ui/Toggle'
import { useSettingsStore } from '@/stores/settingsStore'
import { toast } from '@/stores/toastStore'
import { disableReminders, enableReminders, permission, reminderSupport, sendTestReminder, syncReminders } from '@/services/reminderService'
import type { ReminderConfig } from '@/types/models'

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const label12 = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`
}

function summary(c: ReminderConfig) {
  const parts: string[] = []
  if (c.water.enabled) {
    const count = Math.floor((toMin(c.water.end) - toMin(c.water.start)) / c.water.everyMinutes) + 1
    parts.push(`Water ${count} times, ${label12(c.water.start)} to ${label12(c.water.end)}`)
  }
  if (c.sleep.enabled) parts.push(`bedtime at ${label12(c.sleep.time)}`)
  return parts.length ? parts.join(', ') : 'No reminders selected'
}

export function ReminderSettings() {
  const { settings, update } = useSettingsStore()
  const [cfg, setCfg] = useState<ReminderConfig>(settings.reminders)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  useEffect(() => setCfg(settings.reminders), [settings.reminders])

  const support = reminderSupport()
  const on = !!settings.pushEndpoint
  const dirty = JSON.stringify(cfg) !== JSON.stringify(settings.reminders)
  const invalid = cfg.water.enabled && toMin(cfg.water.end) < toMin(cfg.water.start)
    ? 'The end time must be after the start time.' : undefined

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError(undefined)
    try { await fn() } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.') } finally { setBusy(false) }
  }

  const turnOn = () => run(async () => {
    const endpoint = await enableReminders(cfg)
    await update({ reminders: cfg, pushEndpoint: endpoint })
    toast.success('Reminders are on')
  })
  const save = () => run(async () => {
    if (on) await syncReminders(settings.pushEndpoint!, cfg)
    await update({ reminders: cfg })
    toast.success('Reminder times saved')
  })
  const turnOff = () => run(async () => {
    await disableReminders(settings.pushEndpoint)
    await update({ pushEndpoint: undefined })
    toast.show('Reminders are off')
  })
  const test = () => run(async () => {
    await sendTestReminder(settings.pushEndpoint!)
    toast.show('Test sent. Lock your phone to see it as a notification.')
  })

  const setWater = (p: Partial<ReminderConfig['water']>) => setCfg((c) => ({ ...c, water: { ...c.water, ...p } }))
  const setSleep = (p: Partial<ReminderConfig['sleep']>) => setCfg((c) => ({ ...c, sleep: { ...c.sleep, ...p } }))

  return (
    <Card className="space-y-5">
      <div className="flex items-start gap-3">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${on ? 'bg-sage-soft text-sage' : 'bg-indigo-soft text-indigo'}`}>
          {on ? <BellRing size={18} /> : <BellOff size={18} />}
        </div>
        <div>
          <p className="font-semibold text-ink">{on ? 'Reminders are on' : 'Reminders are off'}</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{summary(settings.reminders)}.</p>
        </div>
      </div>

      <div className="space-y-4 border-t border-line pt-4">
        <Toggle label="Drink water" description="Drip asks if you had a glass. YES adds 250 ml." checked={cfg.water.enabled} onChange={(v) => setWater({ enabled: v })} />
        {cfg.water.enabled && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="From">{(id) => <Input id={id} type="time" step={900} value={cfg.water.start} onChange={(e) => setWater({ start: e.target.value })} />}</Field>
            <Field label="To">{(id) => <Input id={id} type="time" step={900} value={cfg.water.end} onChange={(e) => setWater({ end: e.target.value })} />}</Field>
            <Field label="Remind every" className="col-span-2">
              {(id) => (
                <Select id={id} value={cfg.water.everyMinutes} onChange={(e) => setWater({ everyMinutes: Number(e.target.value) })}>
                  <option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option><option value={120}>2 hours</option><option value={180}>3 hours</option>
                </Select>
              )}
            </Field>
          </div>
        )}
        {invalid && <p className="text-[13px] text-rose">{invalid}</p>}
      </div>

      <div className="space-y-4 border-t border-line pt-4">
        <Toggle label="Time to sleep" description="Luna reminds you to put the phone down." checked={cfg.sleep.enabled} onChange={(v) => setSleep({ enabled: v })} />
        {cfg.sleep.enabled && (
          <Field label="Bedtime" className="w-[calc(50%-6px)]">{(id) => <Input id={id} type="time" step={900} value={cfg.sleep.time} onChange={(e) => setSleep({ time: e.target.value })} />}</Field>
        )}
      </div>

      <p className="text-[12px] leading-relaxed text-faint">
        Times are rounded to the nearest 15 minutes. To send reminders while the app is closed, Daily360 stores this phone’s notification address,
        time zone and these times on its free Cloudflare server. Your expenses, habits and wellness data never leave the phone.
      </p>

      {error && <p role="alert" className="rounded-[12px] bg-rose-soft px-3 py-2.5 text-[13px] text-rose">{error}</p>}

      {support === 'needs-install' ? (
        <p className="text-[13px] text-muted">On iPhone, add Daily360 to the Home Screen from Safari first, then open it from there.</p>
      ) : support === 'unsupported' ? (
        <p className="text-[13px] text-muted">This browser cannot show notifications. Use Chrome on Android.</p>
      ) : !on ? (
        <Button block size="lg" onClick={turnOn} disabled={busy || !!invalid}>
          <BellRing size={18} /> {permission() === 'denied' ? 'Notifications blocked' : 'Turn on reminders'}
        </Button>
      ) : (
        <div className="space-y-2">
          {dirty && <Button block size="lg" onClick={save} disabled={busy || !!invalid}>Save reminder times</Button>}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={test} disabled={busy}><Send size={16} /> Send a test</Button>
            <Button variant="danger-soft" onClick={turnOff} disabled={busy}>Turn off</Button>
          </div>
        </div>
      )}
      {!on && dirty && support === 'supported' && (
        <Button block variant="ghost" onClick={save} disabled={busy || !!invalid}>Save times without turning on</Button>
      )}
    </Card>
  )
}
