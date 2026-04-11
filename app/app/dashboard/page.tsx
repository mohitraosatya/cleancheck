import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cn, formatDateTime, statusLabel, statusClass } from '@/lib/utils'
import { AlertTriangle, ClipboardCheck } from 'lucide-react'

export default async function DashboardPage() {
  const user = await getSession()
  if (!user || user.role !== 'OWNER') redirect('/app/properties')

  const [recentTasks, lowInventory] = await Promise.all([
    // Recent submissions
    prisma.task.findMany({
      where: { status: { in: ['SUBMITTED', 'APPROVED', 'NEEDS_REDO'] } },
      orderBy: { submittedAt: 'desc' },
      take: 10,
      include: {
        property: { select: { name: true } },
        createdBy: { select: { name: true } },
        _count: { select: { photos: true } },
      },
    }),
    // Low inventory counts
    prisma.inventoryCount.findMany({
      where: {
        inventoryItem: { threshold: { not: null } },
        count: { not: null },
      },
      include: {
        inventoryItem: { select: { name: true, threshold: true } },
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
  ])

  const lowFlags = lowInventory.filter(
    (c) => c.count !== null && c.inventoryItem.threshold !== null && c.count < c.inventoryItem.threshold!
  )

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
      <p className="text-sm text-neutral-500 mb-8">Recent activity & alerts</p>

      {/* Low inventory alerts */}
      {lowFlags.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-neutral-700" />
            <h2 className="font-semibold text-sm">Low Inventory</h2>
            <span className="ml-auto text-xs bg-black text-white px-2 py-0.5 rounded-full">
              {lowFlags.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {lowFlags.map((c) => (
              <Link
                key={c.id}
                href={`/app/tasks/${c.task.id}`}
                className="bg-white border border-neutral-200 rounded-xl px-5 py-4 flex items-center gap-4 hover:border-neutral-400 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{c.task.property.name}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{c.inventoryItem.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs bg-neutral-900 text-white px-2.5 py-1 rounded-full font-semibold">
                    {c.count} / {c.inventoryItem.threshold} min
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent submissions */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <ClipboardCheck className="w-4 h-4 text-neutral-700" />
          <h2 className="font-semibold text-sm">Recent Submissions</h2>
        </div>

        {recentTasks.length === 0 ? (
          <div className="text-center py-12 text-neutral-400 text-sm">No submissions yet</div>
        ) : (
          <div className="flex flex-col gap-3">
            {recentTasks.map((task) => (
              <Link
                key={task.id}
                href={`/app/tasks/${task.id}`}
                className="bg-white border border-neutral-200 rounded-xl px-5 py-4 hover:border-neutral-400 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{task.property.name}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {task.createdBy.name} · {formatDateTime(task.submittedAt)}
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
