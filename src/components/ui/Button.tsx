import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

const button = cva(
  'inline-flex items-center justify-center gap-2 font-semibold transition-[background,transform,color] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 select-none',
  {
    variants: {
      variant: {
        primary: 'bg-indigo text-white hover:bg-indigo-deep',
        ink: 'bg-ink text-white hover:bg-ink-2',
        soft: 'bg-indigo-soft text-indigo-deep hover:bg-[#dfe1f8]',
        ghost: 'text-muted hover:bg-line/60',
        outline: 'border border-line bg-paper text-text hover:bg-mist',
        danger: 'bg-rose text-white hover:bg-[#b03c51]',
        'danger-soft': 'bg-rose-soft text-rose',
      },
      size: {
        sm: 'h-9 rounded-[12px] px-3 text-sm',
        md: 'h-12 rounded-control px-5 text-[15px]',
        lg: 'h-14 rounded-control px-6 text-base',
        icon: 'h-11 w-11 rounded-full',
      },
      block: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>

export function Button({ className, variant, size, block, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(button({ variant, size, block }), className)} {...props} />
}
