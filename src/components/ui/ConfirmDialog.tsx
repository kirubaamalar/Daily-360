import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'
import { Input } from './Field'

interface ConfirmDialogProps {
  open: boolean
  title: string
  body: ReactNode
  confirmLabel: string
  tone?: 'danger' | 'primary'
  /** When set, the user must type this word before confirming. */
  requireText?: string
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

export function ConfirmDialog({ open, title, body, confirmLabel, tone = 'primary', requireText, onConfirm, onCancel }: ConfirmDialogProps) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  if (!open) return null
  const blocked = !!requireText && typed.trim().toUpperCase() !== requireText.toUpperCase()

  const run = async () => {
    setBusy(true)
    try { await onConfirm() } finally { setBusy(false); setTyped('') }
  }
  const cancel = () => { setTyped(''); onCancel() }

  return createPortal(
    <div className="fixed inset-0 z-[60] grid place-items-center p-6">
      <div className="animate-fade-in absolute inset-0 bg-ink/50" onClick={cancel} aria-hidden />
      <div role="alertdialog" aria-modal="true" aria-label={title} className="animate-page-in relative w-full max-w-[360px] rounded-[24px] bg-paper p-6 shadow-float">
        <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
        <div className="mt-2 text-[15px] leading-relaxed text-muted">{body}</div>
        {requireText && (
          <div className="mt-4">
            <label className="mb-1.5 block text-[13px] text-muted">Type <strong className="text-ink">{requireText}</strong> to confirm</label>
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="characters" autoComplete="off" />
          </div>
        )}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={cancel} disabled={busy}>Cancel</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={run} disabled={blocked || busy}>
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
