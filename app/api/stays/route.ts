import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

// Helper: given a property and checkout date, find or create the cleaning task
async function findOrCreateTask(propertyId: string, checkOutDate: Date, createdByUserId: string) {
  const dateKey = checkOutDate.toISOString().split('T')[0]

  let task = await prisma.task.findUnique({
    where: { propertyId_dateKey: { propertyId, dateKey } },
  })

  if (!task) {
    const created = await prisma.task.create({
      data: { propertyId, createdByUserId, dateKey, status: 'OPEN' },
    })

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
    task = created
  }

  return task
}

// GET /api/stays — list all stays (owner only)
export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req)
  if (!user || user.role !== 'OWNER')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const propertyId = searchParams.get('propertyId')
  const month = searchParams.get('month') // YYYY-MM

  const where: Record<string, unknown> = {}
  if (propertyId) where.propertyId = propertyId
  if (month) {
    const [year, m] = month.split('-').map(Number)
    const start = new Date(year, m - 1, 1)
    const end = new Date(year, m, 1)
    where.OR = [
      { checkIn: { gte: start, lt: end } },
      { checkOut: { gte: start, lt: end } },
    ]
  }

  const stays = await prisma.guestStay.findMany({
    where,
    orderBy: { checkIn: 'asc' },
    include: {
      property: { select: { id: true, name: true } },
      task: {
        select: {
          id: true, status: true, dateKey: true,
          assignments: { include: { user: { select: { id: true, name: true } } } },
        },
      },
    },
  })

  return NextResponse.json({ stays })
}

// POST /api/stays — create a stay + auto-create cleaning task + assign employees
export async function POST(req: NextRequest) {
  const user = await getSessionFromRequest(req)
  if (!user || user.role !== 'OWNER')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { propertyId, guestName, checkIn, checkOut, notes, assignedUserIds } = await req.json()

  if (!propertyId || !checkIn || !checkOut)
    return NextResponse.json({ error: 'propertyId, checkIn, checkOut required' }, { status: 400 })

  const checkInDate = new Date(checkIn)
  const checkOutDate = new Date(checkOut)

  if (checkOutDate <= checkInDate)
    return NextResponse.json({ error: 'checkOut must be after checkIn' }, { status: 400 })

  // Find or create the cleaning task for the checkout date
  const task = await findOrCreateTask(propertyId, checkOutDate, user.id)

  // Create the guest stay linked to the task
  const stay = await prisma.guestStay.create({
    data: {
      propertyId,
      guestName: guestName?.trim() || null,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      notes: notes?.trim() || null,
      taskId: task.id,
    },
    include: {
      property: { select: { id: true, name: true } },
      task: { select: { id: true, status: true, dateKey: true } },
    },
  })

  // Assign employees to the task
  if (Array.isArray(assignedUserIds) && assignedUserIds.length > 0) {
    await prisma.taskAssignment.createMany({
      data: assignedUserIds.map((userId: string) => ({ taskId: task.id, userId })),
      skipDuplicates: true,
    })
  }

  return NextResponse.json({ stay }, { status: 201 })
}
