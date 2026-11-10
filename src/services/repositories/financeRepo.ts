import { db } from '@/database/db'
import { stamp } from '@/utils/id'
import type { Expense, Income } from '@/types/models'

type New<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'isSample'>

export const financeRepo = {
  addExpense: (e: New<Expense>) => db.expenses.add(stamp(e)),
  updateExpense: (id: string, patch: Partial<New<Expense>>) =>
    db.expenses.update(id, { ...patch, updatedAt: new Date().toISOString() }),
  deleteExpense: (id: string) => db.expenses.delete(id),

  addIncome: (i: New<Income>) => db.income.add(stamp(i)),
  updateIncome: (id: string, patch: Partial<New<Income>>) =>
    db.income.update(id, { ...patch, updatedAt: new Date().toISOString() }),
  deleteIncome: (id: string) => db.income.delete(id),
}
