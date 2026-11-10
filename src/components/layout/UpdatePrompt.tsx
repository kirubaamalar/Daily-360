import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/components/ui/Button'

/** Shows when a new version has been downloaded, and once when offline use is ready. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh && !offlineReady) return null
  return (
    <div className="fixed inset-x-0 top-0 z-[80] mx-auto max-w-[430px] p-3 safe-top">
      <div className="animate-page-in flex items-center gap-3 rounded-[18px] bg-ink p-3 pl-4 text-[14px] text-white shadow-float">
        <p className="flex-1">{needRefresh ? 'A new version of Daily360 is ready.' : 'Daily360 now works offline.'}</p>
        {needRefresh ? (
          <Button size="sm" onClick={() => updateServiceWorker(true)}>Update</Button>
        ) : (
          <Button size="sm" variant="ghost" className="text-white" onClick={() => setOfflineReady(false)}>OK</Button>
        )}
        {needRefresh && <Button size="sm" variant="ghost" className="text-[#9aa1c4]" onClick={() => setNeedRefresh(false)}>Later</Button>}
      </div>
    </div>
  )
}
