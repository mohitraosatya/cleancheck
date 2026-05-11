'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Building2, LayoutDashboard, Users, ClipboardList, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NotificationBell } from './notification-bell'

interface NavProps {
  user: { name: string; role: string; email: string }
}

export default function Nav({ user }: NavProps) {
  const pathname = usePathname()
  const router = useRouter()

  const isOwner = user.role === 'OWNER'

  const ownerLinks = [
    { href: '/app/dashboard', label: 'Owner Dashboard', icon: LayoutDashboard },
    { href: '/app/properties', label: 'Properties', icon: Building2 },
    { href: '/app/employees', label: 'Employees', icon: Users },
    { href: '/app/tasks', label: 'Tasks', icon: ClipboardList },
  ]

  const employeeLinks = [
    { href: '/app/properties', label: 'Properties', icon: Building2 },
  ]

  const links = isOwner ? ownerLinks : employeeLinks

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* ── Desktop top nav ────────────────────────────────────────────── */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 z-40 h-14 border-b border-neutral-100 bg-white items-center px-6 gap-8">
        <span className="text-base font-bold tracking-tight mr-4">CleanCheck</span>

        <nav className="flex items-center gap-1 flex-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                pathname.startsWith(href)
                  ? 'bg-black text-white'
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isOwner && <NotificationBell />}
          <span className="text-sm text-neutral-500">{user.name}</span>
          <button
            onClick={logout}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Mobile bottom nav ─────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-100 bg-white pb-safe">
        <div className={cn('grid h-16', isOwner ? 'grid-cols-6' : 'grid-cols-2')}>
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
                pathname.startsWith(href) ? 'text-black' : 'text-neutral-400'
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          ))}
          {isOwner && (
            <Link
              href="/app/notifications"
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors relative',
                pathname.startsWith('/app/notifications') ? 'text-black' : 'text-neutral-400'
              )}
            >
              <NotificationBell asIcon />
              <span>Alerts</span>
            </Link>
          )}
          <button
            onClick={logout}
            className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-neutral-400"
          >
            <LogOut className="w-5 h-5" />
            Sign out
          </button>
        </div>
      </nav>
    </>
  )
}
