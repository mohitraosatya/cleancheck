import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getSessionFromRequest(req)
  if (!user || user.role !== 'OWNER')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.notification.updateMany({
    where: { ownerUserId: user.id, readAt: null },
    data: { readAt: new Date() },
  })
  return NextResponse.json({ ok: true })
}
