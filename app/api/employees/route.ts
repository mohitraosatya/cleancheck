import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req)
  if (!user || user.role !== 'OWNER')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const employees = await prisma.user.findMany({
    where: { role: 'EMPLOYEE' },
    orderBy: { name: 'asc' },
    include: {
      assignedProperties: {
        include: { property: { select: { id: true, name: true } } },
      },
    },
  })
  return NextResponse.json({ employees })
}

export async function POST(req: NextRequest) {
  const user = await getSessionFromRequest(req)
  if (!user || user.role !== 'OWNER')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, email, password } = await req.json()
  if (!name?.trim() || !email?.trim() || !password)
    return NextResponse.json({ error: 'Name, email and password required' }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 409 })

  const passwordHash = await bcrypt.hash(password, 10)
  const employee = await prisma.user.create({
    data: { name: name.trim(), email: email.toLowerCase(), passwordHash, role: 'EMPLOYEE' },
  })

  return NextResponse.json(
    { employee: { id: employee.id, name: employee.name, email: employee.email } },
    { status: 201 }
  )
}
