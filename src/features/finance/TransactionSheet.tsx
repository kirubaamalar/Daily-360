import { useEffect, useState } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Sheet } from '@/components/ui/Sheet'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { EXPENSE_CATEGORIES } from '@/types/models'
import { financeRepo } from '@/services/repositories/financeRepo'
import { useSettingsStore } from '@/stores/settingsStore'
import { toast } from '@/stores/toastStore'
import { todayKey } from '@/utils/date'
import { expenseSchema, incomeSchema, type ExpenseForm, type IncomeForm } from './schemas'

const KIND_LABEL = { regular: 'Everyday spend', emi: 'EMI instalment', loan: 'Loan repayment', savings: 'Moved to savings' } as const

export function TransactionSheet({ open, onClose, initialType = 'expense' }: { open: boolean; onClose: () => void; initialType?: 'expense' | 'income' }) {
  const [type, setType] = useState<'expense' | 'income'>(initialType)
  useEffect(() => { if (open) setType(initialType) }, [open, initialType])
  return (
    <Sheet open={open} onClose={onClose} title={type === 'expense' ? 'Add expense' : 'Add income'}>
      <Segmented label="Transaction type" className="mb-5" value={type} onChange={setType}
        options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} />
      {type === 'expense' ? <ExpenseFormBody onDone={onClose} /> : <IncomeFormBody onDone={onClose} />}
    </Sheet>
  )
}

function ScopeField({ field }: { field: UseFormRegisterReturn }) {
  const allow = useSettingsStore((s) => s.settings.allowCompanyExpenses)
  if (!allow) return null
  return (
    <Field label="Belongs to" hint="Company entries never appear in personal totals.">
      {(id) => (
        <Select id={id} {...field}>
          <option value="personal">Personal</option>
          <option value="company">Company</option>
        </Select>
      )}
    </Field>
  )
}

function ExpenseFormBody({ onDone }: { onDone: () => void }) {
  const currency = useSettingsStore((s) => s.settings.currency)
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { date: todayKey(), category: 'Food', kind: 'regular', scope: 'personal' },
  })
  const kind = watch('kind')

  const submit = handleSubmit(async (v) => {
    try {
      await financeRepo.addExpense({ ...v, reference: v.reference || undefined, note: v.note || undefined })
      toast.success('Expense saved')
      onDone()
    } catch {
      toast.error('Could not save the expense. Check storage space and try again.')
    }
  })

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label={`Amount (${currency})`} error={errors.amount?.message}>
        {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.amount} type="number" inputMode="decimal" step="0.01" min="0" placeholder="0" autoFocus
          className="font-display h-14 text-2xl font-semibold" {...register('amount', { valueAsNumber: true })} />}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">{(id) => <Select id={id} {...register('category')}>{EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select>}</Field>
        <Field label="Date" error={errors.date?.message}>{(id) => <Input id={id} type="date" max={todayKey()} {...register('date')} />}</Field>
      </div>
      <Field label="Type">
        {(id) => <Select id={id} {...register('kind')}>{Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>}
      </Field>
      {kind !== 'regular' && (
        <Field label={kind === 'savings' ? 'Savings goal or account' : 'Loan name'} error={errors.reference?.message}>
          {(id) => <Input id={id} placeholder={kind === 'savings' ? 'Emergency fund' : 'Bike loan'} {...register('reference')} />}
        </Field>
      )}
      <ScopeField field={register('scope')} />
      <Field label="Note" error={errors.note?.message}>{(id) => <Textarea id={id} rows={2} className="min-h-0" placeholder="Optional" {...register('note')} />}</Field>
      <Button type="submit" block size="lg" disabled={isSubmitting}>Save expense</Button>
    </form>
  )
}

function IncomeFormBody({ onDone }: { onDone: () => void }) {
  const currency = useSettingsStore((s) => s.settings.currency)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<IncomeForm>({
    resolver: zodResolver(incomeSchema),
    defaultValues: { date: todayKey(), source: 'Salary', scope: 'personal' },
  })
  const submit = handleSubmit(async (v) => {
    try {
      await financeRepo.addIncome({ ...v, note: v.note || undefined })
      toast.success('Income saved')
      onDone()
    } catch {
      toast.error('Could not save the income. Try again.')
    }
  })
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label={`Amount (${currency})`} error={errors.amount?.message}>
        {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.amount} type="number" inputMode="decimal" step="0.01" min="0" placeholder="0" autoFocus
          className="font-display h-14 text-2xl font-semibold" {...register('amount', { valueAsNumber: true })} />}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Source" error={errors.source?.message}>{(id) => <Input id={id} {...register('source')} />}</Field>
        <Field label="Date" error={errors.date?.message}>{(id) => <Input id={id} type="date" {...register('date')} />}</Field>
      </div>
      <ScopeField field={register('scope')} />
      <Field label="Note">{(id) => <Textarea id={id} rows={2} className="min-h-0" placeholder="Optional" {...register('note')} />}</Field>
      <Button type="submit" block size="lg" disabled={isSubmitting}>Save income</Button>
    </form>
  )
}
