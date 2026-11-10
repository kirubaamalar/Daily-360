import { db } from '@/database/db'
import { stamp } from '@/utils/id'
import { toDayKey } from '@/utils/date'

const SUBJECT_COLORS = ['#4C55C9', '#2F8A69', '#C2410C', '#2E86C1', '#7A5AC8', '#B97C14', '#C8475E', '#3F6B8F']

export const studyRepo = {
  addSubject: async (name: string) => {
    const count = await db.study_subjects.count()
    const subject = stamp({ name: name.trim(), color: SUBJECT_COLORS[count % SUBJECT_COLORS.length], archived: false })
    await db.study_subjects.add(subject)
    return subject
  },

  /** The running session, if any. A session is running while endedAt is unset. */
  activeSession: () => db.study_sessions.filter((s) => !s.endedAt).first(),

  start: async (subjectId: string, topicId?: string) => {
    const running = await studyRepo.activeSession()
    if (running) throw new Error('A study session is already running. Stop it first.')
    const now = new Date()
    const session = stamp({ subjectId, topicId, date: toDayKey(now), startedAt: now.toISOString(), durationMinutes: 0 })
    await db.study_sessions.add(session)
    return session
  },

  stop: async (sessionId: string, note?: string) => {
    const s = await db.study_sessions.get(sessionId)
    if (!s || s.endedAt) return
    const end = new Date()
    const minutes = Math.max(0, Math.round((end.getTime() - new Date(s.startedAt).getTime()) / 60000))
    await db.study_sessions.update(sessionId, {
      endedAt: end.toISOString(), durationMinutes: minutes, note, updatedAt: end.toISOString(),
    })
    return minutes
  },

  discard: (sessionId: string) => db.study_sessions.delete(sessionId),
}
