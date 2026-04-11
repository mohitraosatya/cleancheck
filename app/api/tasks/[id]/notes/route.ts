import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: taskId } = await params
  const { notes } = await req.json()

  const task = await prisma.task.findUnique({ where: { id: taskId } })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (task.status !== 'OPEN' && task.status !== 'NEEDS_REDO')
    return NextResponse.json({ error: 'Task not editable' }, { status: 400 })

  const updated = await prisma.task.update({ where: { id: taskId }, data: { notes } })
  return NextResponse.json({ task: updated })
}
