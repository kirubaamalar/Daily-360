import { cn } from '@/utils/cn'
export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('animate-pulse rounded-card bg-line/70', className)} aria-hidden />
)
