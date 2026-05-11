import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cn, formatDate, formatDateTime, statusLabel, statusClass } from '@/lib/utils'
import { AlertTriangle, ClipboardCheck, CalendarDays } from 'lucide-react'

type UpcomingStay = {
  id: string
  guestName: string | null
  checkOut: Date
  property: { name: string }
  task: { id: string; status: string } | null
}

type LowInvCount = {
  id: string
  inventoryItem: { name: string }
  task: { id: string; dateKey: string; status: string; property: { name: string } }
}

type RecentTask = {
  id: string
  status: string
  submittedAt: Date | null
  property: { name: string }
  createdBy: { name: string }
  assignments: { user: { name: string } }[]
}

export default async function DashboardPage() {
  const user = await getSession()
  if (!user || user.role !== 'OWNER') redirect('/app/properties')

  const [recentTasks, lowInventory, upcomingStays] = await Promise.all([
    prisma.task.findMany({
      where: { status: { in: ['SUBMITTED', 'APPROVED', 'NEEDS_REDO'] } },
      orderBy: { submittedAt: 'desc' },
      take: 10,
      include: {
        property: { select: { name: true } },
        createdBy: { select: { name: true } },
        _count: { select: { photos: true } },
        assignments: { include: { user: { select: { name: true } } } },
      },
    }),
    prisma.inventoryCount.findMany({
      where: { level: 'LOW' },
      include: {
        inventoryItem: { select: { name: true } },
        task: {
          select: {
            id: true, dateKey: true, status: true,
            property: { select: { name: true } },
          },
        },
      },
      orderBy: { task: { dateKey: 'desc' } },
      take: 20,
    }),
    prisma.guestStay.findMany({
      where: {
        checkOut: {
          gte: new Date(),
          lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { checkOut: 'asc' },
      take: 6,
      include: {
        property: { select: { name: true } },
        task: { select: { id: true, status: true } },
      },
    }),
  ]) as [RecentTask[], LowInvCount[], UpcomingStay[]]

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
      <p className="text-sm text-neutral-500 mb-8">Recent activity &amp; alerts</p>

      {/* Upcoming checkouts */}
      {upcomingStays.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-4 h-4 text-neutral-700" />
            <h2 className="font-semibold text-sm">Upcoming Check-outs</h2>
            <Link href="/app/calendar" className="ml-auto text-xs text-neutral-400 hover:text-black transition-colors">
              View calendar →
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {upcomingStays.map((s: UpcomingStay) => (
              <div
                key={s.id}
                className="bg-white border border-neutral-200 rounded-xl px-5 py-3 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{s.property.name}</p>
                  {s.guestName && <p className="text-xs text-neutral-400">{s.guestName}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold">{formatDate(s.checkOut)}</p>
                  {s.task && (
                    <Link href={`/app/tasks/${s.task.id}`} className="text-[10px] text-neutral-400 hover:text-black">
                      {statusLabel(s.task.status)}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Low inventory alerts */}
      {lowInventory.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-neutral-700" />
            <h2 className="font-semibold text-sm">Low Inventory</h2>
            <span className="ml-auto text-xs bg-black text-white px-2 py-0.5 rounded-full">
              {lowInventory.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {lowInventory.map((c: LowInvCount) => (
              <Link
                key={c.id}
                href={`/app/tasks/${c.task.id}`}
                className="bg-white border border-neutral-200 rounded-xl px-5 py-4 flex items-center gap-4 hover:border-neutral-400 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{c.task.property.name}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{c.inventoryItem.name}</p>
                </div>
                <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-semibold shrink-0">
                  Low
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent activity */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <ClipboardCheck className="w-4 h-4 text-neutral-700" />
          <h2 className="font-semibold text-sm">Recent Activity</h2>
        </div>

        {recentTasks.length === 0 ? (
          <div className="text-center py-12 text-neutral-400 text-sm">No activity yet</div>
        ) : (
          <div className="flex flex-col gap-3">
            {recentTasks.map((task: RecentTask) => (
              <Link
                key={task.id}
                href={`/app/tasks/${task.id}`}
                className="bg-white border border-neutral-200 rounded-xl px-5 py-4 hover:border-neutral-400 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{task.property.name}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {task.assignments.length > 0
                        ? task.assignments.map((a: { user: { name: string } }) => a.user.name).join(', ')
                        : task.createdBy.name}
                      {' · '}
                      {formatDateTime(task.submittedAt)}
                    </p>
                  </div>
                  <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full shrink-0', statusClass(task.status))}>
                    {statusLabel(task.status)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
