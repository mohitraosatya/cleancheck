import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: taskId } = await params
  const { type, url } = await req.json()

  if (!['PRE', 'POST', 'INVENTORY'].includes(type))
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { property: { select: { name: true } } },
  })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (task.status !== 'OPEN' && task.status !== 'NEEDS_REDO')
    return NextResponse.json({ error: 'Task not editable' }, { status: 400 })

  const photo = await prisma.photo.create({ data: { taskId, type, url } })

  // Notify owner when post-clean photos are added
  if (type === 'POST') {
    const owner = await prisma.user.findFirst({ where: { role: 'OWNER' } })
    if (owner) {
      await prisma.notification.create({
        data: {
          ownerUserId: owner.id,
          type: 'PHOTO_UPLOADED',
          taskId,
          message: `Post-clean photo added to ${task.property.name}`,
        },
      })
    }
  }

  return NextResponse.json({ photo }, { status: 201 })
}
