import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionFromRequest(req)
  if (!user || user.role !== 'OWNER')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: propertyId } = await params

  const [checklist, inventory] = await Promise.all([
    prisma.checklistTemplate.findUnique({
      where: { propertyId },
      include: { items: { orderBy: { order: 'asc' } } },
    }),
    prisma.inventoryTemplate.findUnique({
      where: { propertyId },
      include: { items: { orderBy: { order: 'asc' } } },
    }),
  ])

  return NextResponse.json({ checklist, inventory })
}

// Update checklist template items
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionFromRequest(req)
  if (!user || user.role !== 'OWNER')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: propertyId } = await params
  const { type, action, label, itemId, name, threshold, enabled } = await req.json()

  if (type === 'checklist') {
    // Ensure template exists
    let tpl = await prisma.checklistTemplate.findUnique({ where: { propertyId } })
    if (!tpl) tpl = await prisma.checklistTemplate.create({ data: { propertyId } })

    if (action === 'add') {
      const maxOrder = await prisma.checklistItem.count({ where: { templateId: tpl.id } })
      const item = await prisma.checklistItem.create({
        data: { templateId: tpl.id, label: label.trim(), order: maxOrder },
      })
      return NextResponse.json({ item })
    }
    if (action === 'delete') {
      await prisma.checklistItem.delete({ where: { id: itemId } })
      return NextResponse.json({ ok: true })
    }
    if (action === 'update') {
      const item = await prisma.checklistItem.update({
        where: { id: itemId },
        data: { label: label.trim() },
      })
      return NextResponse.json({ item })
    }
  }

  if (type === 'inventory') {
    // Ensure template exists
    let tpl = await prisma.inventoryTemplate.findUnique({ where: { propertyId } })
    if (!tpl) tpl = await prisma.inventoryTemplate.create({ data: { propertyId } })

    if (action === 'toggle') {
      const updated = await prisma.inventoryTemplate.update({
        where: { id: tpl.id },
        data: { enabled },
      })
      return NextResponse.json({ template: updated })
    }
    if (action === 'add') {
      const maxOrder = await prisma.inventoryItem.count({ where: { templateId: tpl.id } })
      const item = await prisma.inventoryItem.create({
        data: {
          templateId: tpl.id,
          name: name.trim(),
          threshold: threshold ? parseInt(threshold) : null,
          order: maxOrder,
        },
      })
      return NextResponse.json({ item })
    }
    if (action === 'delete') {
      await prisma.inventoryItem.delete({ where: { id: itemId } })
      return NextResponse.json({ ok: true })
    }
    if (action === 'update') {
      const item = await prisma.inventoryItem.update({
        where: { id: itemId },
        data: { name: name.trim(), threshold: threshold ? parseInt(threshold) : null },
      })
      return NextResponse.json({ item })
    }
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
}
