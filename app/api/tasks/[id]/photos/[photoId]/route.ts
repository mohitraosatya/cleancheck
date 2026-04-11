import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import { storage } from '@/lib/storage'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const user = await getSessionFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: taskId, photoId } = await params

  const photo = await prisma.photo.findUnique({ where: { id: photoId } })
  if (!photo || photo.taskId !== taskId)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const task = await prisma.task.findUnique({ where: { id: taskId } })
  if (task?.status !== 'OPEN' && task?.status !== 'NEEDS_REDO')
    return NextResponse.json({ error: 'Task not editable' }, { status: 400 })

  // Delete file from storage
  await storage.delete(photo.url)
  await prisma.photo.delete({ where: { id: photoId } })

  return NextResponse.json({ ok: true })
}
