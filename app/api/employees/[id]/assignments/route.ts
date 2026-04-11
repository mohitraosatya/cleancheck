import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

// GET assignments for an employee
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionFromRequest(req)
  if (!user || user.role !== 'OWNER')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const assignments = await prisma.propertyAssignment.findMany({
    where: { userId: id },
    include: { property: { select: { id: true, name: true } } },
  })
  return NextResponse.json({ assignments })
}

// PUT = full replace of assignments for employee
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionFromRequest(req)
  if (!user || user.role !== 'OWNER')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: employeeId } = await params
  const { propertyIds } = await req.json() // string[]

  await prisma.$transaction([
    prisma.propertyAssignment.deleteMany({ where: { userId: employeeId } }),
    ...(propertyIds as string[]).map((propertyId: string) =>
      prisma.propertyAssignment.create({ data: { userId: employeeId, propertyId } })
    ),
  ])

  return NextResponse.json({ ok: true })
}
