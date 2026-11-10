import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Sheet } from '@/components/ui/Sheet'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { db } from '@/database/db'
import { stamp } from '@/utils/id'
import { toast } from '@/stores/toastStore'
import { todayKey } from '@/utils/date'
import type { CompanyProject } from '@/types/models'

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date'),
  hours: z.number({ error: 'Enter hours' }).int().min(0).max(24),
  minutes: z.number({ error: 'Enter minutes' }).int().min(0).max(59),
  projectId: z.string().optional(),
  summary: z.string().trim().min(1, 'Describe what you worked on').max(300),
  isLearning: z.boolean(),
}).refine((v) => v.hours * 60 + v.minutes > 0, { path: ['minutes'], message: 'Log at least one minute' })
type Form = z.infer<typeof schema>

export function WorkLogSheet({ open, onClose, projects }: { open: boolean; onClose: () => void; projects: CompanyProject[] }) {
  const defaults: Form = { date: todayKey(), hours: 1, minutes: 0, projectId: '', summary: '', isLearning: false }
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: defaults })
  useEffect(() => { if (open) reset({ ...defaults, date: todayKey() }) }, [open]) // defaults are static

  const submit = handleSubmit(async (v) => {
    await db.company_work_logs.add(stamp({ date: v.date, minutes: v.hours * 60 + v.minutes, projectId: v.projectId || undefined, summary: v.summary, isLearning: v.isLearning }))
    toast.success('Work time logged')
    onClose()
  })
  const n = { valueAsNumber: true } as const

  return (
    <Sheet open={open} onClose={onClose} title="Log work time" footer={<Button block size="lg" onClick={submit} disabled={isSubmitting}>Save log</Button>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Hours" error={errors.hours?.message}>{(id) => <Input id={id} type="number" inputMode="numeric" {...register('hours', n)} />}</Field>
          <Field label="Minutes" error={errors.minutes?.message}>{(id) => <Input id={id} type="number" inputMode="numeric" step="5" {...register('minutes', n)} />}</Field>
          <Field label="Date" error={errors.date?.message}>{(id) => <Input id={id} type="date" className="px-2 text-[14px]" {...register('date')} />}</Field>
        </div>
        {projects.length > 0 && (
          <Field label="Project">{(id) => <Select id={id} {...register('projectId')}><option value="">No project</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>}</Field>
        )}
        <Field label="What did you work on?" error={errors.summary?.message}>{(id) => <Textarea id={id} rows={3} {...register('summary')} />}</Field>
        <label className="flex items-center gap-3 px-1 text-[14px] text-ink">
          <input type="checkbox" className="h-5 w-5 accent-[#4c55c9]" {...register('isLearning')} /> This was work-related learning
        </label>
      </form>
    </Sheet>
  )
}
