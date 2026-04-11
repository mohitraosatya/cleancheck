'use client'

import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import Link from 'next/link'

interface NotificationBellProps {
  /** When true, renders just the icon + badge (no <Link> wrapper) — use inside an existing <Link> */
  asIcon?: boolean
}

export function NotificationBell({ asIcon = false }: NotificationBellProps) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/notifications?unread=true')
        if (res.ok) {
          const data = await res.json()
          setCount(data.count ?? 0)
        }
      } catch {
        // ignore
      }
    }
    fetchCount()
    const id = setInterval(fetchCount, 30_000)
    return () => clearInterval(id)
  }, [])

  const badge = count > 0 && (
    <span className="absolute top-1 right-1 bg-black text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
      {count > 9 ? '9+' : count}
    </span>
  )

  if (asIcon) {
    return (
      <div className="relative">
        <Bell className="w-5 h-5" />
        {badge}
      </div>
    )
  }

  return (
    <Link
      href="/app/notifications"
      className="relative p-2 rounded-lg hover:bg-neutral-100 transition-colors"
    >
      <Bell className="w-5 h-5" />
      {badge}
    </Link>
  )
}
