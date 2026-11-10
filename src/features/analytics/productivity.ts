import type { DailyTargets, ProductivityWeights } from '@/types/models'

/**
 * Transparent daily productivity score.
 *
 *   component ratio = min(actual / target, 1)
 *   score = Σ(weight × ratio) / Σ(weight)  over components that have a target
 *
 * Personal tasks are measured against the tasks planned for that day (falling back to
 * the daily task target if nothing is planned); habits against habits due that day.
 * Wellness data (sleep, water, mood, weight…) is intentionally never an input.
 */
export interface ProductivityInputs {
  studyMinutes: number
  tasksDone: number
  tasksPlanned: number
  habitsDone: number
  habitsDue: number
  companyMinutes: number
}

export interface ProductivityComponent {
  key: keyof ProductivityWeights
  label: string
  actual: number
  target: number
  ratio: number
  weight: number
  unit: 'min' | 'count'
}

export interface ProductivityResult {
  /** null when no component has both a target and a weight */
  score: number | null
  components: ProductivityComponent[]
}

export function calculateProductivity(i: ProductivityInputs, targets: DailyTargets, weights: ProductivityWeights): ProductivityResult {
  const raw: Omit<ProductivityComponent, 'ratio'>[] = [
    { key: 'study', label: 'Study', actual: i.studyMinutes, target: targets.studyMinutes, weight: weights.study, unit: 'min' },
    { key: 'personalTasks', label: 'Personal tasks', actual: i.tasksDone, target: i.tasksPlanned || targets.personalTasks, weight: weights.personalTasks, unit: 'count' },
    { key: 'habits', label: 'Habits', actual: i.habitsDone, target: i.habitsDue, weight: weights.habits, unit: 'count' },
    { key: 'companyWork', label: 'Company work', actual: i.companyMinutes, target: targets.companyWorkMinutes, weight: weights.companyWork, unit: 'min' },
  ]
  const components = raw.map((c) => ({ ...c, ratio: c.target > 0 ? Math.min(c.actual / c.target, 1) : 0 }))
  const counted = components.filter((c) => c.target > 0 && c.weight > 0)
  const totalWeight = counted.reduce((a, c) => a + c.weight, 0)
  const score = totalWeight > 0 ? Math.round((counted.reduce((a, c) => a + c.weight * c.ratio, 0) / totalWeight) * 100) : null
  return { score, components }
}
