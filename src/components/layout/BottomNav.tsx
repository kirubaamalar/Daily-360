import { NavLink } from 'react-router-dom'
import { BarChart3, Briefcase, House, Settings2, UserRound, type LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

const items: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Home', icon: House },
  { to: '/personal', label: 'Personal', icon: UserRound },
  { to: '/company', label: 'Company', icon: Briefcase },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings2 },
]

export function BottomNav() {
  return (
    <nav aria-label="Primary" className="safe-bottom fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[430px] px-3 pb-2">
      <ul className="flex items-center justify-between rounded-[24px] bg-ink px-1.5 py-1.5 shadow-float">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex h-[54px] flex-col items-center justify-center gap-0.5 rounded-[18px] text-[11px] font-semibold transition-colors',
                  isActive ? 'bg-ink-3 text-white' : 'text-[#9aa1c4] hover:text-white',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={21} strokeWidth={isActive ? 2.3 : 1.9} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
