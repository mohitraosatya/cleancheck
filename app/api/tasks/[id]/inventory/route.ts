import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

const VALID_LEVELS = ['NONE', 'LOW', 'MEDIUM', 'FULL'] as const
type InventoryLevel = typeof VALID_LEVELS[number]

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: taskId } = await params
  const { inventoryItemId, level } = await req.json()

  const task = await prisma.task.findUnique({ where: { id: taskId } })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (task.status !== 'OPEN' && task.status !== 'NEEDS_REDO')
    return NextResponse.json({ error: 'Task not editable' }, { status: 400 })

  const validLevel: InventoryLevel | null =
    level && VALID_LEVELS.includes(level as InventoryLevel) ? (level as InventoryLevel) : null

  const invCount = await prisma.inventoryCount.upsert({
    where: { taskId_inventoryItemId: { taskId, inventoryItemId } },
    update: { level: validLevel },
    create: { taskId, inventoryItemId, level: validLevel },
  })

  return NextResponse.json({ invCount })
}
