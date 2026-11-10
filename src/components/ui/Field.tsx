import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

const control =
  'w-full rounded-control border border-line bg-paper px-4 text-[16px] text-text placeholder:text-faint transition-colors focus:border-indigo focus:outline-none focus:ring-4 focus:ring-indigo/12 aria-[invalid=true]:border-rose aria-[invalid=true]:ring-rose/10'

/** Keeps the focused control visible above the on-screen keyboard. */
const revealOnFocus = (e: React.FocusEvent<HTMLElement>) => {
  const el = e.currentTarget
  setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 280)
}

interface FieldProps {
  label: string
  error?: string
  hint?: string
  children: (id: string, describedBy?: string) => ReactNode
  className?: string
}

export function Field({ label, error, hint, children, className }: FieldProps) {
  const id = useId()
  const msgId = `${id}-msg`
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block px-1 text-[13px] font-medium text-muted">{label}</label>
      {children(id, error || hint ? msgId : undefined)}
      {error ? (
        <p id={msgId} role="alert" className="px-1 text-[13px] text-rose">{error}</p>
      ) : hint ? (
        <p id={msgId} className="px-1 text-[13px] text-faint">{hint}</p>
      ) : null}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, onFocus, ...props }, ref) => (
    <input ref={ref} className={cn(control, 'h-12', className)} onFocus={(e) => { revealOnFocus(e); onFocus?.(e) }} {...props} />
  ),
)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, onFocus, ...props }, ref) => (
    <textarea ref={ref} className={cn(control, 'min-h-24 py-3 leading-relaxed', className)} onFocus={(e) => { revealOnFocus(e); onFocus?.(e) }} {...props} />
  ),
)
Textarea.displayName = 'Textarea'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn(control, 'h-12 appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%235d6583%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m4%206%204%204%204-4%22/%3E%3C/svg%3E")] bg-[length:16px] bg-[right_14px_center] bg-no-repeat pr-10', className)} {...props} />
  ),
)
Select.displayName = 'Select'
