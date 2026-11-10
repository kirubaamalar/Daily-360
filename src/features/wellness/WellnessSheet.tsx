import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Minus, Plus } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { RatingPicker } from '@/components/ui/RatingPicker'
import { wellnessRepo } from '@/services/repositories/wellnessRepo'
import { toast } from '@/stores/toastStore'
import type { WellnessLog } from '@/types/models'

const num = (min: number, max: number, msg: string) => z.number().min(min, msg).max(max, msg).optional()
const schema = z.object({
  sleepHours: num(0, 24, 'Enter 0–24 hours'),
  sleepQuality: z.number().int().min(1).max(5).optional(),
  waterMl: num(0, 10000, 'Enter 0–10,000 ml'),
  exerciseMinutes: num(0, 1440, 'Enter 0–1440 minutes'),
  walkingMinutes: num(0, 1440, 'Enter 0–1440 minutes'),
  weightKg: num(20, 400, 'Enter a weight between 20 and 400 kg'),
  mood: z.number().int().min(1).max(5).optional(),
  energy: z.number().int().min(1).max(5).optional(),
  journal: z.string().trim().max(4000, 'Journal entries are limited to 4000 characters').optional(),
})
type Form = z.infer<typeof schema>

const asNumber = { setValueAs: (v: string) => (v === '' || v == null ? undefined : Number(v)) }

export function WellnessSheet({ open, onClose, date, log }: { open: boolean; onClose: () => void; date: string; log?: WellnessLog }) {
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open) reset({
      sleepHours: log?.sleepHours, sleepQuality: log?.sleepQuality, waterMl: log?.waterMl,
      exerciseMinutes: log?.exerciseMinutes, walkingMinutes: log?.walkingMinutes, weightKg: log?.weightKg,
      mood: log?.mood, energy: log?.energy, journal: log?.journal ?? '',
    })
  }, [open, log, reset])

  const water = watch('waterMl') ?? 0
  const submit = handleSubmit(async (v) => {
    await wellnessRepo.upsert(date, { ...v, journal: v.journal || undefined })
    toast.success('Wellness saved')
    onClose()
  })

  return (
    <Sheet open={open} onClose={onClose} title="Wellness today"
      footer={<Button block size="lg" onClick={submit} disabled={isSubmitting}>Save wellness</Button>}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sleep (hours)" error={errors.sleepHours?.message}>
            {(id) => <Input id={id} type="number" inputMode="decimal" step="0.25" placeholder="7.5" {...register('sleepHours', asNumber)} />}
          </Field>
          <Field label="Weight (kg)" error={errors.weightKg?.message}>
            {(id) => <Input id={id} type="number" inputMode="decimal" step="0.1" placeholder="Optional" {...register('weightKg', asNumber)} />}
          </Field>
        </div>
        <div className="space-y-1.5">
          <p className="px-1 text-[13px] font-medium text-muted">Sleep quality</p>
          <RatingPicker name="Sleep quality" value={watch('sleepQuality')} onChange={(v) => setValue('sleepQuality', v)}
            labels={['Poor', 'Light', 'Okay', 'Good', 'Deep']} />
        </div>
        <div className="space-y-1.5">
          <p className="px-1 text-[13px] font-medium text-muted">Water</p>
          <div className="flex items-center gap-3 rounded-control border border-line bg-paper p-1.5">
            <Button type="button" variant="soft" size="icon" aria-label="Remove 250 ml" onClick={() => setValue('waterMl', Math.max(0, water - 250))}><Minus size={18} /></Button>
            <p className="font-display tabular flex-1 text-center text-xl font-semibold text-sky">{water.toLocaleString()} ml</p>
            <Button type="button" variant="soft" size="icon" aria-label="Add 250 ml" onClick={() => setValue('waterMl', water + 250)}><Plus size={18} /></Button>
          </div>
          {errors.waterMl && <p className="px-1 text-[13px] text-rose">{errors.waterMl.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Exercise (min)" error={errors.exerciseMinutes?.message}>
            {(id) => <Input id={id} type="number" inputMode="numeric" placeholder="0" {...register('exerciseMinutes', asNumber)} />}
          </Field>
          <Field label="Walking (min)" error={errors.walkingMinutes?.message}>
            {(id) => <Input id={id} type="number" inputMode="numeric" placeholder="0" {...register('walkingMinutes', asNumber)} />}
          </Field>
        </div>
        <div className="space-y-1.5">
          <p className="px-1 text-[13px] font-medium text-muted">Mood</p>
          <RatingPicker name="Mood" value={watch('mood')} onChange={(v) => setValue('mood', v)} labels={['Low', 'Flat', 'Steady', 'Good', 'Great']} />
        </div>
        <div className="space-y-1.5">
          <p className="px-1 text-[13px] font-medium text-muted">Energy</p>
          <RatingPicker name="Energy" value={watch('energy')} onChange={(v) => setValue('energy', v)} labels={['Drained', 'Tired', 'Okay', 'Fresh', 'Charged']} />
        </div>
        <Field label="Journal" error={errors.journal?.message}>
          {(id) => <Textarea id={id} rows={4} placeholder="How did today feel?" {...register('journal')} />}
        </Field>
        <p className="px-1 text-[12px] leading-relaxed text-faint">These are your own notes. Daily360 shows trends only and does not give medical advice or health scores.</p>
      </form>
    </Sheet>
  )
}
