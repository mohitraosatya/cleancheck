import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req)
  if (!user || user.role !== 'OWNER')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const unreadOnly = searchParams.get('unread') === 'true'

  if (unreadOnly) {
    const count = await prisma.notification.count({
      where: { ownerUserId: user.id, readAt: null },
    })
    return NextResponse.json({ count })
  }

  const notifications = await prisma.notification.findMany({
    where: { ownerUserId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      task: { include: { property: { select: { name: true } } } },
    },
  })
  return NextResponse.json({ notifications })
}
