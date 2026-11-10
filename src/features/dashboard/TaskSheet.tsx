import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Sheet } from '@/components/ui/Sheet'
import { Field, Input, Select } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { taskRepo } from '@/services/repositories/taskRepo'
import { toast } from '@/stores/toastStore'
import { todayKey } from '@/utils/date'

const schema = z.object({
  title: z.string().trim().min(1, 'Describe the task').max(120, 'Keep it under 120 characters'),
  priority: z.enum(['low', 'medium', 'high']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date'),
})
type Form = z.infer<typeof schema>

export function TaskSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', priority: 'medium', date: todayKey() },
  })
  const close = () => { reset({ title: '', priority: 'medium', date: todayKey() }); onClose() }
  const submit = handleSubmit(async (v) => {
    await taskRepo.add({ ...v, done: false })
    toast.success('Task added')
    close()
  })
  return (
    <Sheet open={open} onClose={close} title="Add personal task">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Task" error={errors.title?.message}>
          {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.title} autoFocus enterKeyHint="done" placeholder="Renew bike insurance" {...register('title')} />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Priority">{(id) => <Select id={id} {...register('priority')}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></Select>}</Field>
          <Field label="Day" error={errors.date?.message}>{(id) => <Input id={id} type="date" {...register('date')} />}</Field>
        </div>
        <p className="px-1 text-[13px] text-faint">Company tasks live in the Company section and are tracked separately.</p>
        <Button type="submit" block size="lg" disabled={isSubmitting}>Add task</Button>
      </form>
    </Sheet>
  )
}
