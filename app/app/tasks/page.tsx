import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDate, statusLabel, statusClass, cn } from '@/lib/utils'

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string; status?: string; dateKey?: string }>
}) {
  const user = await getSession()
  if (!user || user.role !== 'OWNER') redirect('/app/properties')

  const params = await searchParams
  const { propertyId, status, dateKey } = params

  const [tasks, properties] = await Promise.all([
    prisma.task.findMany({
      where: {
        ...(propertyId ? { propertyId } : {}),
        ...(status ? { status: status as 'OPEN' | 'SUBMITTED' | 'APPROVED' | 'NEEDS_REDO' } : {}),
        ...(dateKey ? { dateKey } : {}),
      },
      orderBy: [{ dateKey: 'desc' }, { createdAt: 'desc' }],
      include: {
        property: { select: { name: true } },
        createdBy: { select: { name: true } },
        _count: { select: { photos: true, checklistResponses: true } },
      },
      take: 50,
    }),
    prisma.property.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  const statusOptions = ['OPEN', 'SUBMITTED', 'APPROVED', 'NEEDS_REDO']

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">Tasks</h1>
      <p className="text-sm text-neutral-500 mb-6">{tasks.length} results</p>

      {/* Filters */}
      <form className="flex flex-wrap gap-2 mb-8">
        <select
          name="propertyId"
          defaultValue={propertyId ?? ''}
          className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        >
          <option value="">All properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          name="status"
          defaultValue={status ?? ''}
          className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        >
          <option value="">All statuses</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>

        <input
          type="date"
          name="dateKey"
          defaultValue={dateKey ?? ''}
          className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />

        <button
          type="submit"
          className="h-9 px-4 rounded-lg bg-black text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
        >
          Filter
        </button>

        {(propertyId || status || dateKey) && (
          <Link
            href="/app/tasks"
            className="h-9 px-4 rounded-lg border border-neutral-200 text-sm flex items-center hover:bg-neutral-100 transition-colors"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Task list */}
      {tasks.length === 0 ? (
        <div className="text-center py-16 text-neutral-400 text-sm">No tasks found</div>
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.map((task) => (
            <Link
              key={task.id}
              href={`/app/tasks/${task.id}`}
              className="bg-white border border-neutral-200 rounded-xl px-5 py-4 hover:border-neutral-400 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm">{task.property.name}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {formatDate(task.dateKey)} · {task.createdBy.name}
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">
                    {task._count.photos} photos · {task._count.checklistResponses} checklist items
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
    </div>
  )
}
