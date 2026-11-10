import { useEffect, useRef, useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { DatabaseBackup, Download, FileSpreadsheet, FlaskConical, HardDrive, RotateCcw, Upload } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Field, Input } from '@/components/ui/Field'
import { downloadBackup, parseBackup, resetAllData, restoreBackup, summarise, type BackupFile } from '@/services/backupService'
import { exportTransactionsCsv } from '@/services/csvService'
import { loadSampleData, removeSampleData } from '@/services/sampleDataService'
import { useSettingsStore } from '@/stores/settingsStore'
import { toast } from '@/stores/toastStore'
import { useDataPresence } from '@/hooks/useSampleData'

function Row({ icon: Icon, title, body, children }: { icon: typeof Download; title: string; body: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-4 first:pt-1 last:pb-1">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-indigo-soft text-indigo"><Icon size={18} /></div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{title}</p>
        <div className="mt-0.5 text-[13px] leading-relaxed text-muted">{body}</div>
        <div className="mt-3 flex flex-wrap gap-2">{children}</div>
      </div>
    </div>
  )
}

export function DataManagement() {
  const { settings, init } = useSettingsStore()
  const presence = useDataPresence()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<BackupFile>()
  const [confirmReset, setConfirmReset] = useState(false)
  const [csvFrom, setCsvFrom] = useState('')
  const [csvTo, setCsvTo] = useState('')
  const [storage, setStorage] = useState<{ used: number; persisted: boolean }>()

  useEffect(() => {
    const read = async () => {
      const est = await navigator.storage?.estimate?.()
      const persisted = (await navigator.storage?.persisted?.()) ?? false
      setStorage({ used: est?.usage ?? 0, persisted })
    }
    read()
  }, [])

  const backup = async () => {
    try { await downloadBackup(); await init(); toast.success('Backup downloaded') }
    catch { toast.error('Backup failed. Free some storage and try again.') }
  }

  const pickFile = async (file?: File) => {
    if (!file) return
    try { setPending(parseBackup(await file.text())) }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not read that file.') }
    finally { if (fileRef.current) fileRef.current.value = '' }
  }

  const summary = pending && summarise(pending)
  const total = summary ? Object.values(summary.counts).reduce((a, b) => a + (b ?? 0), 0) : 0

  return (
    <Card className="divide-y divide-line">
      <Row icon={DatabaseBackup} title="Back up" body={
        settings.lastBackupAt
          ? <>Last backup {formatDistanceToNow(new Date(settings.lastBackupAt), { addSuffix: true })} ({format(new Date(settings.lastBackupAt), `${settings.dateFormat}, HH:mm`)}).</>
          : <>No backup yet. Data lives only in this browser, so clearing site data or losing the phone deletes it.</>
      }>
        <Button size="sm" onClick={backup}><Download size={15} /> Download JSON backup</Button>
      </Row>

      <Row icon={Upload} title="Restore" body="Replaces everything on this device with the contents of a Daily360 backup file.">
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
        <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>Choose backup file</Button>
      </Row>

      <Row icon={FileSpreadsheet} title="Export transactions" body="Income and expenses as a CSV ledger. Leave dates empty to export everything.">
        <div className="grid w-full grid-cols-2 gap-2">
          <Field label="From">{(id) => <Input id={id} type="date" value={csvFrom} onChange={(e) => setCsvFrom(e.target.value)} />}</Field>
          <Field label="To">{(id) => <Input id={id} type="date" value={csvTo} onChange={(e) => setCsvTo(e.target.value)} />}</Field>
        </div>
        <Button size="sm" variant="outline" disabled={!!csvFrom && !!csvTo && csvFrom > csvTo}
          onClick={async () => {
            const n = await exportTransactionsCsv({ from: csvFrom || undefined, to: csvTo || undefined, includeCompany: settings.allowCompanyExpenses })
            toast[n ? 'success' : 'show'](n ? `Exported ${n} transactions` : 'No transactions in that range. An empty CSV was downloaded.')
          }}>
          <Download size={15} /> Download CSV
        </Button>
      </Row>

      <Row icon={FlaskConical} title="Sample data" body={presence?.hasSample
        ? 'Sample records are loaded. Removing them leaves your own entries untouched.'
        : 'Loads three weeks of clearly marked demo records so you can explore the app.'}>
        {presence?.hasSample ? (
          <Button size="sm" variant="danger-soft" onClick={async () => { const n = await removeSampleData(); toast.success(`Removed ${n} sample records`) }}>Remove sample data</Button>
        ) : (
          <Button size="sm" variant="soft" onClick={async () => { await loadSampleData(); toast.success('Sample data loaded') }}>Load sample data</Button>
        )}
      </Row>

      <Row icon={HardDrive} title="Storage on this device" body={storage
        ? <>Using {(storage.used / 1024 / 1024).toFixed(2)} MB. {storage.persisted ? 'The browser will not clear this data automatically.' : 'The browser may clear this data if the phone runs low on space.'}</>
        : 'Checking…'}>
        {storage && !storage.persisted && navigator.storage?.persist && (
          <Button size="sm" variant="outline" onClick={async () => {
            const ok = await navigator.storage.persist()
            setStorage((s) => s && { ...s, persisted: ok })
            toast[ok ? 'success' : 'show'](ok ? 'Storage protected' : 'The browser declined. Installing the app usually allows it.')
          }}>Protect storage</Button>
        )}
      </Row>

      <Row icon={RotateCcw} title="Reset Daily360" body="Deletes every record and setting on this device. Download a backup first.">
        <Button size="sm" variant="danger-soft" onClick={() => setConfirmReset(true)}>Delete all data</Button>
      </Row>

      <ConfirmDialog open={!!pending} title="Restore this backup?" confirmLabel="Replace my data" tone="danger"
        body={summary && <>
          Backup from {format(new Date(summary.exportedAt), `${settings.dateFormat}, HH:mm`)} with {total} records
          ({summary.counts.expenses ?? 0} expenses, {summary.counts.study_sessions ?? 0} study sessions, {summary.counts.habit_logs ?? 0} habit logs).
          Everything currently on this device will be replaced.
        </>}
        onCancel={() => setPending(undefined)}
        onConfirm={async () => {
          try { await restoreBackup(pending!); await init(); toast.success('Backup restored') }
          catch { toast.error('Restore failed. Your existing data was kept.') }
          setPending(undefined)
        }} />

      <ConfirmDialog open={confirmReset} title="Delete all data?" confirmLabel="Delete everything" tone="danger" requireText="RESET"
        body="This permanently removes every transaction, session, habit, log, and setting stored by Daily360 on this device. It cannot be undone."
        onCancel={() => setConfirmReset(false)}
        onConfirm={async () => { await resetAllData(); await init(); setConfirmReset(false); toast.success('All data deleted') }} />
    </Card>
  )
}
