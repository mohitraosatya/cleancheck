import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import { todayKey } from '@/lib/utils'

const taskInclude = {
  property: { select: { name: true, id: true } },
  createdBy: { select: { name: true, email: true } },
  checklistResponses: {
    include: { checklistItem: { select: { id: true, label: true, order: true } } },
    orderBy: { checklistItem: { order: 'asc' as const } },
  },
  photos: { orderBy: { createdAt: 'asc' as const } },
  inventoryCounts: {
    include: { inventoryItem: { select: { id: true, name: true, threshold: true, order: true } } },
    orderBy: { inventoryItem: { order: 'asc' as const } },
  },
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: propertyId } = await params

  // Access check for employees
  if (user.role === 'EMPLOYEE') {
    const assignment = await prisma.propertyAssignment.findUnique({
      where: { userId_propertyId: { userId: user.id, propertyId } },
    })
    if (!assignment) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const dateKey = todayKey()

  // Get existing task or create new one
  let task = await prisma.task.findUnique({
    where: { propertyId_dateKey: { propertyId, dateKey } },
    include: taskInclude,
  })

  if (!task) {
    // Create task
    const created = await prisma.task.create({
      data: { propertyId, createdByUserId: user.id, dateKey, status: 'OPEN' },
    })

    // Init checklist responses from template
    const template = await prisma.checklistTemplate.findUnique({
      where: { propertyId },
      include: { items: true },
    })
    if (template?.items.length) {
      await prisma.checklistResponse.createMany({
        data: template.items.map((item) => ({
          taskId: created.id,
          checklistItemId: item.id,
          checked: false,
        })),
        skipDuplicates: true,
      })
    }

    task = await prisma.task.findUnique({
      where: { id: created.id },
      include: taskInclude,
    })
  }

  // Inventory template for this property
  const inventoryTemplate = await prisma.inventoryTemplate.findUnique({
    where: { propertyId },
    include: { items: { orderBy: { order: 'asc' } } },
  })

  return NextResponse.json({ task, inventoryTemplate })
}
