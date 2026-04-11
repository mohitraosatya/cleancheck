import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

async function checkAccess(userId: string, role: string, propertyId: string) {
  if (role === 'OWNER') return true
  const a = await prisma.propertyAssignment.findUnique({
    where: { userId_propertyId: { userId, propertyId } },
  })
  return !!a
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (!(await checkAccess(user.id, user.role, id)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      checklistTemplate: { include: { items: { orderBy: { order: 'asc' } } } },
      inventoryTemplate: { include: { items: { orderBy: { order: 'asc' } } } },
      _count: { select: { assignments: true } },
    },
  })
  if (!property) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ property })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionFromRequest(req)
  if (!user || user.role !== 'OWNER')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { name, address } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const property = await prisma.property.update({
    where: { id },
    data: { name: name.trim(), address },
  })
  return NextResponse.json({ property })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionFromRequest(req)
  if (!user || user.role !== 'OWNER')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  await prisma.property.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
