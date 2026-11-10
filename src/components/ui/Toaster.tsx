import { CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { useToastStore } from '@/stores/toastStore'
import { cn } from '@/utils/cn'

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[92px] z-[70] mx-auto flex max-w-[430px] flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map((t) => {
        const Icon = t.tone === 'success' ? CheckCircle2 : t.tone === 'error' ? AlertCircle : Info
        return (
          <button
            key={t.id}
            onClick={() => dismiss(t.id)}
            className="animate-page-in pointer-events-auto flex w-full items-center gap-3 rounded-[16px] bg-ink px-4 py-3 text-left text-[14px] text-white shadow-float"
          >
            <Icon size={18} className={cn(t.tone === 'success' && 'text-[#7fd6b2]', t.tone === 'error' && 'text-[#f29aaa]', t.tone === 'default' && 'text-[#aab0ff]')} />
            <span className="flex-1">{t.message}</span>
          </button>
        )
      })}
    </div>
  )
}
