import { useEffect, useState } from 'react'
import { Play } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Field, Input } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { studyRepo } from '@/services/repositories/studyRepo'
import { toast } from '@/stores/toastStore'
import type { StudySubject } from '@/types/models'
import { cn } from '@/utils/cn'

const SUGGESTED = ['Java', 'Spring Boot', 'React', 'Node.js', 'SQL', 'Python']

export function StartStudySheet({ open, onClose, subjects }: { open: boolean; onClose: () => void; subjects: StudySubject[] }) {
  const [selected, setSelected] = useState<string>()
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (open) { setSelected(subjects[0]?.id); setNewName(''); setError(undefined) } }, [open, subjects])

  const existingNames = new Set(subjects.map((s) => s.name.toLowerCase()))
  const suggestions = SUGGESTED.filter((s) => !existingNames.has(s.toLowerCase()))

  const start = async () => {
    setError(undefined)
    const name = newName.trim()
    if (!selected && !name) return setError('Choose a subject or type a new one.')
    if (name && existingNames.has(name.toLowerCase())) return setError('That subject already exists. Pick it above.')
    if (name.length > 40) return setError('Keep subject names under 40 characters.')
    setBusy(true)
    try {
      const subjectId = name ? (await studyRepo.addSubject(name)).id : selected!
      await studyRepo.start(subjectId)
      toast.success('Timer started')
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the session.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Start study session"
      footer={<Button block size="lg" onClick={start} disabled={busy}><Play size={18} /> Start timer</Button>}>
      {subjects.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 px-1 text-[13px] font-medium text-muted">Your subjects</p>
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <button key={s.id} type="button" onClick={() => { setSelected(s.id); setNewName('') }}
                className={cn('flex h-10 items-center gap-2 rounded-full border px-4 text-[14px] font-semibold transition-colors',
                  selected === s.id && !newName ? 'border-ink bg-ink text-white' : 'border-line bg-paper text-text')}>
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <Field label={subjects.length ? 'Or add a new subject' : 'Subject'} error={error}>
        {(id, d) => <Input id={id} aria-describedby={d} value={newName} placeholder="e.g. Spring Boot" enterKeyHint="go"
          onChange={(e) => { setNewName(e.target.value); setError(undefined) }}
          onKeyDown={(e) => e.key === 'Enter' && start()} />}
      </Field>
      {suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button key={s} type="button" onClick={() => { setNewName(s); setSelected(undefined) }}
              className="h-8 rounded-full bg-indigo-soft px-3 text-[13px] font-semibold text-indigo-deep">+ {s}</button>
          ))}
        </div>
      )}
      <p className="mt-5 px-1 text-[13px] leading-relaxed text-faint">The timer keeps running if you close the app. Stop it from Home when you finish.</p>
    </Sheet>
  )
}
