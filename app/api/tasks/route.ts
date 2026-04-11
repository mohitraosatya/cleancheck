import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req)
  if (!user || user.role !== 'OWNER')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const propertyId = searchParams.get('propertyId') ?? undefined
  const status = searchParams.get('status') ?? undefined
  const dateKey = searchParams.get('dateKey') ?? undefined

  const tasks = await prisma.task.findMany({
    where: {
      ...(propertyId ? { propertyId } : {}),
      ...(status ? { status: status as 'OPEN' | 'SUBMITTED' | 'APPROVED' | 'NEEDS_REDO' } : {}),
      ...(dateKey ? { dateKey } : {}),
    },
    orderBy: [{ dateKey: 'desc' }, { createdAt: 'desc' }],
    include: {
      property: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { photos: true, checklistResponses: true } },
    },
    take: 50,
  })

  return NextResponse.json({ tasks })
}
