import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { useSettingsStore } from '@/stores/settingsStore'
import { toast } from '@/stores/toastStore'
import { CURRENCIES } from '@/utils/currency'

const int = (min: number, max: number, msg: string) => z.number({ error: msg }).int(msg).min(min, msg).max(max, msg)

const schema = z.object({
  displayName: z.string().trim().max(30, 'Keep it under 30 characters'),
  currency: z.string(),
  dateFormat: z.enum(['dd MMM yyyy', 'dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd']),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]),
  studyMinutes: int(0, 1440, 'Enter 0–1440 minutes'),
  waterMl: int(0, 10000, 'Enter 0–10,000 ml'),
  sleepHours: z.number({ error: 'Enter 0–24 hours' }).min(0, 'Enter 0–24 hours').max(24, 'Enter 0–24 hours'),
  companyWorkMinutes: int(0, 1440, 'Enter 0–1440 minutes'),
  personalTasks: int(0, 50, 'Enter 0–50 tasks'),
  wStudy: int(0, 100, '0–100'),
  wTasks: int(0, 100, '0–100'),
  wHabits: int(0, 100, '0–100'),
  wWork: int(0, 100, '0–100'),
  allowCompanyExpenses: z.boolean(),
}).refine((v) => v.wStudy + v.wTasks + v.wHabits + v.wWork > 0, { path: ['wWork'], message: 'At least one weight must be above zero' })
type Form = z.infer<typeof schema>

export function PreferencesForm() {
  const { settings, update } = useSettingsStore()
  const toForm = (): Form => ({
    displayName: settings.displayName, currency: settings.currency, dateFormat: settings.dateFormat, weekStartsOn: settings.weekStartsOn,
    ...settings.targets,
    wStudy: settings.weights.study, wTasks: settings.weights.personalTasks, wHabits: settings.weights.habits, wWork: settings.weights.companyWork,
    allowCompanyExpenses: settings.allowCompanyExpenses,
  })
  const { register, handleSubmit, reset, formState: { errors, isDirty, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: toForm() })
  useEffect(() => { reset(toForm()) }, [settings])

  const n = { valueAsNumber: true } as const
  const submit = handleSubmit(async (v) => {
    const locale = CURRENCIES.find((c) => c.code === v.currency)?.locale ?? 'en-IN'
    await update({
      displayName: v.displayName, currency: v.currency, locale, dateFormat: v.dateFormat, weekStartsOn: v.weekStartsOn,
      targets: { studyMinutes: v.studyMinutes, waterMl: v.waterMl, sleepHours: v.sleepHours, companyWorkMinutes: v.companyWorkMinutes, personalTasks: v.personalTasks },
      weights: { study: v.wStudy, personalTasks: v.wTasks, habits: v.wHabits, companyWork: v.wWork },
      allowCompanyExpenses: v.allowCompanyExpenses,
    })
    toast.success('Settings saved')
  })

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <Card className="space-y-4">
        <Field label="Your name" hint="Used only for the greeting." error={errors.displayName?.message}>
          {(id) => <Input id={id} autoComplete="given-name" placeholder="Optional" {...register('displayName')} />}
        </Field>
        <Field label="Currency">
          {(id) => <Select id={id} {...register('currency')}>{CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}</Select>}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date format">
            {(id) => <Select id={id} {...register('dateFormat')}>
              <option value="dd MMM yyyy">10 Nov 2026</option><option value="dd/MM/yyyy">10/11/2026</option>
              <option value="MM/dd/yyyy">11/10/2026</option><option value="yyyy-MM-dd">2026-11-10</option>
            </Select>}
          </Field>
          <Field label="Week starts">
            {(id) => <Select id={id} {...register('weekStartsOn', { setValueAs: (v) => Number(v) as 0 | 1 })}>
              <option value={1}>Monday</option><option value={0}>Sunday</option>
            </Select>}
          </Field>
        </div>
      </Card>

      <div>
        <h3 className="mb-3 px-1 font-display text-[17px] font-semibold text-ink">Daily targets</h3>
        <Card className="grid grid-cols-2 gap-3">
          <Field label="Study (min)" error={errors.studyMinutes?.message}>{(id) => <Input id={id} type="number" inputMode="numeric" {...register('studyMinutes', n)} />}</Field>
          <Field label="Company work (min)" error={errors.companyWorkMinutes?.message}>{(id) => <Input id={id} type="number" inputMode="numeric" {...register('companyWorkMinutes', n)} />}</Field>
          <Field label="Personal tasks" error={errors.personalTasks?.message}>{(id) => <Input id={id} type="number" inputMode="numeric" {...register('personalTasks', n)} />}</Field>
          <Field label="Water (ml)" error={errors.waterMl?.message}>{(id) => <Input id={id} type="number" inputMode="numeric" step="250" {...register('waterMl', n)} />}</Field>
          <Field label="Sleep (hours)" error={errors.sleepHours?.message}>{(id) => <Input id={id} type="number" inputMode="decimal" step="0.25" {...register('sleepHours', n)} />}</Field>
        </Card>
      </div>

      <div>
        <h3 className="px-1 font-display text-[17px] font-semibold text-ink">Productivity weights</h3>
        <p className="mb-3 mt-1 px-1 text-[13px] leading-relaxed text-muted">How much each area counts toward the daily percentage. Weights are relative, so 2/2/1/1 works the same as 40/40/20/20. Sleep, water, mood and weight are never included.</p>
        <Card className="grid grid-cols-2 gap-3">
          <Field label="Study" error={errors.wStudy?.message}>{(id) => <Input id={id} type="number" inputMode="numeric" {...register('wStudy', n)} />}</Field>
          <Field label="Personal tasks" error={errors.wTasks?.message}>{(id) => <Input id={id} type="number" inputMode="numeric" {...register('wTasks', n)} />}</Field>
          <Field label="Habits" error={errors.wHabits?.message}>{(id) => <Input id={id} type="number" inputMode="numeric" {...register('wHabits', n)} />}</Field>
          <Field label="Company work" error={errors.wWork?.message}>{(id) => <Input id={id} type="number" inputMode="numeric" {...register('wWork', n)} />}</Field>
        </Card>
      </div>

      <Card>
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 h-5 w-5 accent-[#4c55c9]" {...register('allowCompanyExpenses')} />
          <span>
            <span className="block font-semibold text-ink">Record company money too</span>
            <span className="mt-0.5 block text-[13px] leading-relaxed text-muted">Adds a Personal / Company choice to transactions. Company entries stay out of personal totals, budgets, and savings.</span>
          </span>
        </label>
      </Card>

      {isDirty && (
        <div className="animate-page-in sticky bottom-[96px] z-10">
          <Button type="submit" block size="lg" disabled={isSubmitting} className="shadow-float">Save settings</Button>
        </div>
      )}
    </form>
  )
}
