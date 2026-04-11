import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (user.role === 'OWNER') {
    const properties = await prisma.property.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { assignments: true, tasks: true } } },
    })
    return NextResponse.json({ properties })
  }

  // Employee: only assigned
  const assignments = await prisma.propertyAssignment.findMany({
    where: { userId: user.id },
    include: { property: true },
    orderBy: { property: { name: 'asc' } },
  })
  return NextResponse.json({ properties: assignments.map((a) => a.property) })
}

export async function POST(req: NextRequest) {
  const user = await getSessionFromRequest(req)
  if (!user || user.role !== 'OWNER')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, address } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const property = await prisma.property.create({ data: { name: name.trim(), address } })
  return NextResponse.json({ property }, { status: 201 })
}
