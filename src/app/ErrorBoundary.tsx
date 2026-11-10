import { Component, type ReactNode } from 'react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {}
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col justify-center bg-mist p-8">
        <h1 className="font-display text-2xl font-semibold text-ink">This screen stopped working</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">Your data is still saved on this device. Reload to continue. If it happens again, download a backup from Settings.</p>
        <p className="mt-4 rounded-[12px] bg-paper p-3 text-[12px] text-faint">{this.state.error.message}</p>
        <button className="mt-6 h-12 rounded-control bg-indigo font-semibold text-white" onClick={() => location.reload()}>Reload Daily360</button>
      </div>
    )
  }
}
