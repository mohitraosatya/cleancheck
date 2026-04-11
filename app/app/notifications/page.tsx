'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageSpinner } from '@/components/ui/spinner'
import { cn, formatDateTime } from '@/lib/utils'

interface Notification {
  id: string
  type: string
  message: string | null
  createdAt: string
  readAt: string | null
  taskId: string | null
  task: {
    id: string
    dateKey: string
    property: { name: string }
  } | null
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  const fetchNotifications = useCallback(async () => {
    const res = await fetch('/api/notifications')
    if (res.status === 403) { router.push('/app/properties'); return }
    const data = await res.json()
    setNotifications(data.notifications ?? [])
    setLoading(false)
  }, [router])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
    setNotifications((ns) =>
      ns.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
    )
  }

  const markAllRead = async () => {
    setMarkingAll(true)
    await fetch('/api/notifications/read-all', { method: 'POST' })
    setMarkingAll(false)
    fetchNotifications()
  }

  const typeLabel = (type: string) => {
    if (type === 'TASK_SUBMITTED') return 'Task submitted'
    if (type === 'PHOTO_UPLOADED') return 'Photo uploaded'
    return type
  }

  const unreadCount = notifications.filter((n) => !n.readAt).length

  if (loading) return <PageSpinner />

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={markAllRead} loading={markingAll}>
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 text-neutral-400">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No notifications yet</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              onClick={() => {
                if (!n.readAt) markRead(n.id)
                if (n.taskId) router.push(`/app/tasks/${n.taskId}`)
              }}
              className={cn(
                'bg-white border border-neutral-200 rounded-xl px-5 py-4 cursor-pointer hover:border-neutral-400 transition-colors',
                !n.readAt && 'border-l-4 border-l-black'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{typeLabel(n.type)}</p>
                  {n.task && (
                    <p className="text-xs text-neutral-600 mt-0.5">
                      {n.task.property.name} · {n.task.dateKey}
                    </p>
                  )}
                  {n.message && (
                    <p className="text-xs text-neutral-400 mt-1 truncate">{n.message}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-neutral-400">{formatDateTime(n.createdAt)}</p>
                  {!n.readAt && (
                    <span className="inline-block w-2 h-2 bg-black rounded-full mt-1.5" />
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
