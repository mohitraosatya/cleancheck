import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: taskId } = await params
  const { notes } = await req.json().catch(() => ({ notes: undefined }))

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { photos: true, property: { select: { name: true } } },
  })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (task.status !== 'OPEN' && task.status !== 'NEEDS_REDO')
    return NextResponse.json({ error: 'Task already submitted' }, { status: 400 })

  // Validate submission requirements
  const postPhotos = task.photos.filter((p) => p.type === 'POST')
  const invPhotos = task.photos.filter((p) => p.type === 'INVENTORY')

  if (postPhotos.length < 1)
    return NextResponse.json({ error: 'At least 1 post-clean photo required' }, { status: 422 })
  if (invPhotos.length < 1)
    return NextResponse.json({ error: 'At least 1 inventory photo required' }, { status: 422 })

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { status: 'SUBMITTED', submittedAt: new Date(), notes: notes ?? task.notes },
  })

  // Notify owner
  const owner = await prisma.user.findFirst({ where: { role: 'OWNER' } })
  if (owner) {
    await prisma.notification.create({
      data: {
        ownerUserId: owner.id,
        type: 'TASK_SUBMITTED',
        taskId,
        message: `Task submitted for ${task.property.name}`,
      },
    })
  }

  return NextResponse.json({ task: updated })
}
