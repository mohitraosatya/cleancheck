import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionFromRequest(req)
  if (!user || user.role !== 'OWNER')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: taskId } = await params
  const { decision, comment } = await req.json() // decision: 'APPROVED' | 'NEEDS_REDO'

  if (!['APPROVED', 'NEEDS_REDO'].includes(decision))
    return NextResponse.json({ error: 'Invalid decision' }, { status: 400 })

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: decision === 'APPROVED' ? 'APPROVED' : 'NEEDS_REDO',
      reviewStatus: decision,
      reviewComment: comment ?? null,
      reviewedAt: new Date(),
    },
  })

  return NextResponse.json({ task })
}
