import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

// PUT /api/tasks/[id]/assign — replace full assignment list
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionFromRequest(req)
  if (!user || user.role !== 'OWNER')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: taskId } = await params
  const { userIds } = await req.json()

  if (!Array.isArray(userIds))
    return NextResponse.json({ error: 'userIds must be an array' }, { status: 400 })

  const task = await prisma.task.findUnique({ where: { id: taskId } })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Replace all assignments
  await prisma.taskAssignment.deleteMany({ where: { taskId } })

  if (userIds.length > 0) {
    await prisma.taskAssignment.createMany({
      data: userIds.map((userId: string) => ({ taskId, userId })),
      skipDuplicates: true,
    })
  }

  const assignments = await prisma.taskAssignment.findMany({
    where: { taskId },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  return NextResponse.json({ assignments })
}

// GET /api/tasks/[id]/assign — list current assignments
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: taskId } = await params

  const assignments = await prisma.taskAssignment.findMany({
    where: { taskId },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  return NextResponse.json({ assignments })
}
