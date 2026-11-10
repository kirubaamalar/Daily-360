import { z } from 'zod'
import { EXPENSE_CATEGORIES } from '@/types/models'

const amount = z
  .number({ error: 'Enter an amount' })
  .positive('Amount must be more than zero')
  .max(100_000_000, 'Amount is too large')
  .refine((v) => Math.round(v * 100) === v * 100 || Math.abs(Math.round(v * 100) - v * 100) < 1e-6, 'Use at most two decimal places')

export const expenseSchema = z.object({
  amount,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date'),
  category: z.enum(EXPENSE_CATEGORIES),
  kind: z.enum(['regular', 'emi', 'loan', 'savings']),
  scope: z.enum(['personal', 'company']),
  reference: z.string().trim().max(60, 'Keep it under 60 characters').optional(),
  note: z.string().trim().max(200, 'Keep notes under 200 characters').optional(),
})
export type ExpenseForm = z.infer<typeof expenseSchema>

export const incomeSchema = z.object({
  amount,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date'),
  source: z.string().trim().min(1, 'Add a source, like Salary').max(60),
  scope: z.enum(['personal', 'company']),
  note: z.string().trim().max(200).optional(),
})
export type IncomeForm = z.infer<typeof incomeSchema>
