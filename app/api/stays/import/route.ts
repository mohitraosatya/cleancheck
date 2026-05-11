import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

// POST /api/stays/import
// Body: { rows: [{ propertyName, guestName?, checkIn, checkOut, notes? }] }
export async function POST(req: NextRequest) {
  const user = await getSessionFromRequest(req)
  if (!user || user.role !== 'OWNER')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { rows } = await req.json()

  if (!Array.isArray(rows) || rows.length === 0)
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })

  // Load all properties to match by name (case-insensitive)
  const properties = await prisma.property.findMany({ select: { id: true, name: true } })
  const propMap = new Map(properties.map((p) => [p.name.toLowerCase(), p.id]))

  const results: { row: number; ok: boolean; error?: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const propertyId = propMap.get((row.propertyName ?? '').toLowerCase())
    if (!propertyId) {
      results.push({ row: i + 1, ok: false, error: `Property "${row.propertyName}" not found` })
      continue
    }

    const checkInDate = new Date(row.checkIn)
    const checkOutDate = new Date(row.checkOut)

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      results.push({ row: i + 1, ok: false, error: 'Invalid date format' })
      continue
    }

    if (checkOutDate <= checkInDate) {
      results.push({ row: i + 1, ok: false, error: 'checkOut must be after checkIn' })
      continue
    }

    const dateKey = checkOutDate.toISOString().split('T')[0]

    try {
      // Find or create the cleaning task for the checkout date
      let task = await prisma.task.findUnique({
        where: { propertyId_dateKey: { propertyId, dateKey } },
      })

      if (!task) {
        const created = await prisma.task.create({
          data: { propertyId, createdByUserId: user.id, dateKey, status: 'OPEN' },
        })

        const template = await prisma.checklistTemplate.findUnique({
          where: { propertyId },
          include: { items: true },
        })
        if (template?.items.length) {
          await prisma.checklistResponse.createMany({
            data: template.items.map((item) => ({
              taskId: created.id,
              checklistItemId: item.id,
              checked: false,
            })),
            skipDuplicates: true,
          })
        }
        task = created
      }

      await prisma.guestStay.create({
        data: {
          propertyId,
          guestName: row.guestName?.trim() || null,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          notes: row.notes?.trim() || null,
          taskId: task.id,
        },
      })

      results.push({ row: i + 1, ok: true })
    } catch {
      results.push({ row: i + 1, ok: false, error: 'Failed to create stay' })
    }
  }

  return NextResponse.json({ results })
}
