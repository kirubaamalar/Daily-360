import { useEffect, useState } from 'react'
import { Square, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { studyRepo } from '@/services/repositories/studyRepo'
import { toast } from '@/stores/toastStore'
import { formatMinutes } from '@/utils/date'
import type { StudySession, StudySubject } from '@/types/models'

function elapsed(startedAt: string) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  return `${h ? `${h}:` : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(sec).padStart(2, '0')}`
}

export function ActiveSessionCard({ session, subject }: { session: StudySession; subject?: StudySubject }) {
  const [, tick] = useState(0)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const stop = async () => {
    const minutes = await studyRepo.stop(session.id)
    if (minutes !== undefined) toast.success(minutes ? `Saved ${formatMinutes(minutes)} of study` : 'Session under a minute saved as 0m')
  }

  return (
    <div className="flex items-center gap-3 rounded-card bg-paper p-3 pl-4 shadow-card">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: subject?.color ?? '#4C55C9' }} />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: subject?.color ?? '#4C55C9' }} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] text-muted">Studying {subject?.name ?? 'a subject'}</p>
        <p className="font-display tabular text-[22px] font-semibold leading-tight text-ink">{elapsed(session.startedAt)}</p>
      </div>
      <Button variant="ghost" size="icon" aria-label="Discard session" onClick={() => setConfirmDiscard(true)}><Trash2 size={18} /></Button>
      <Button variant="ink" size="sm" className="h-11 px-4" onClick={stop}><Square size={14} fill="currentColor" /> Stop</Button>
      <ConfirmDialog open={confirmDiscard} title="Discard this session?" tone="danger" confirmLabel="Discard"
        body="The running timer will be deleted and no study time will be recorded."
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={async () => { await studyRepo.discard(session.id); setConfirmDiscard(false); toast.show('Session discarded') }} />
    </div>
  )
}
