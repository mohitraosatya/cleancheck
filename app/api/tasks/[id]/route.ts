import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      property: { select: { id: true, name: true, address: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      checklistResponses: {
        include: { checklistItem: { select: { id: true, label: true, order: true } } },
        orderBy: { checklistItem: { order: 'asc' } },
      },
      photos: { orderBy: { createdAt: 'asc' } },
      inventoryCounts: {
        include: {
          inventoryItem: { select: { id: true, name: true, order: true } },
        },
        orderBy: { inventoryItem: { order: 'asc' } },
      },
      assignments: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      guestStay: {
        select: { id: true, guestName: true, checkIn: true, checkOut: true, notes: true },
      },
    },
  })

  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Access check
  if (user.role === 'EMPLOYEE' && task.createdByUserId !== user.id) {
    const assignment = await prisma.propertyAssignment.findUnique({
      where: { userId_propertyId: { userId: user.id, propertyId: task.propertyId } },
    })
    if (!assignment) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ task })
}
