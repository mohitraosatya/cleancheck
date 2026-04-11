import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const hash = await bcrypt.hash('password123', 10)

  // ── Users ──────────────────────────────────────────────────────────────────

  const owner = await prisma.user.upsert({
    where: { email: 'owner@demo.com' },
    update: {},
    create: { name: 'Sam Owner', email: 'owner@demo.com', passwordHash: hash, role: 'OWNER' },
  })

  const alice = await prisma.user.upsert({
    where: { email: 'alice@demo.com' },
    update: {},
    create: { name: 'Alice Cleaner', email: 'alice@demo.com', passwordHash: hash, role: 'EMPLOYEE' },
  })

  const bob = await prisma.user.upsert({
    where: { email: 'bob@demo.com' },
    update: {},
    create: { name: 'Bob Cleaner', email: 'bob@demo.com', passwordHash: hash, role: 'EMPLOYEE' },
  })

  // ── Properties ─────────────────────────────────────────────────────────────

  const villa = await prisma.property.upsert({
    where: { id: 'prop-villa-001' },
    update: {},
    create: { id: 'prop-villa-001', name: 'Beachside Villa', address: '123 Ocean Dr, Miami FL' },
  })

  const resto = await prisma.property.upsert({
    where: { id: 'prop-resto-002' },
    update: {},
    create: { id: 'prop-resto-002', name: 'Downtown Restaurant', address: '456 Main St, Miami FL' },
  })

  // ── Assignments ────────────────────────────────────────────────────────────

  await prisma.propertyAssignment.upsert({
    where: { userId_propertyId: { userId: alice.id, propertyId: villa.id } },
    update: {},
    create: { userId: alice.id, propertyId: villa.id },
  })

  await prisma.propertyAssignment.upsert({
    where: { userId_propertyId: { userId: alice.id, propertyId: resto.id } },
    update: {},
    create: { userId: alice.id, propertyId: resto.id },
  })

  await prisma.propertyAssignment.upsert({
    where: { userId_propertyId: { userId: bob.id, propertyId: resto.id } },
    update: {},
    create: { userId: bob.id, propertyId: resto.id },
  })

  // ── Checklist Template: Villa ──────────────────────────────────────────────

  const villaCL = await prisma.checklistTemplate.upsert({
    where: { propertyId: villa.id },
    update: {},
    create: { propertyId: villa.id },
  })

  const villaItems = [
    'Vacuum all floors',
    'Scrub bathrooms & toilets',
    'Change bed linens',
    'Wipe kitchen surfaces & stovetop',
    'Empty all trash bins',
    'Restock soap & shampoo',
    'Check fridge — remove old items',
  ]

  for (let i = 0; i < villaItems.length; i++) {
    const existing = await prisma.checklistItem.findFirst({
      where: { templateId: villaCL.id, label: villaItems[i] },
    })
    if (!existing) {
      await prisma.checklistItem.create({
        data: { templateId: villaCL.id, label: villaItems[i], order: i },
      })
    }
  }

  // ── Inventory Template: Villa ──────────────────────────────────────────────

  const villaINV = await prisma.inventoryTemplate.upsert({
    where: { propertyId: villa.id },
    update: { enabled: true },
    create: { propertyId: villa.id, enabled: true },
  })

  const villaInvItems = [
    { name: 'Bath towels', threshold: 4 },
    { name: 'Hand towels', threshold: 4 },
    { name: 'Toiletry sets', threshold: 2 },
    { name: 'Coffee pods', threshold: 8 },
    { name: 'Toilet paper rolls', threshold: 4 },
  ]

  for (let i = 0; i < villaInvItems.length; i++) {
    const existing = await prisma.inventoryItem.findFirst({
      where: { templateId: villaINV.id, name: villaInvItems[i].name },
    })
    if (!existing) {
      await prisma.inventoryItem.create({
        data: { templateId: villaINV.id, ...villaInvItems[i], order: i },
      })
    }
  }

  // ── Checklist Template: Restaurant ────────────────────────────────────────

  const restoCL = await prisma.checklistTemplate.upsert({
    where: { propertyId: resto.id },
    update: {},
    create: { propertyId: resto.id },
  })

  const restoItems = [
    'Wipe all tables & chairs',
    'Mop kitchen & dining floors',
    'Clean restrooms',
    'Stock napkins & condiments',
    'Sanitize food prep surfaces',
    'Take out kitchen garbage',
  ]

  for (let i = 0; i < restoItems.length; i++) {
    const existing = await prisma.checklistItem.findFirst({
      where: { templateId: restoCL.id, label: restoItems[i] },
    })
    if (!existing) {
      await prisma.checklistItem.create({
        data: { templateId: restoCL.id, label: restoItems[i], order: i },
      })
    }
  }

  console.log('\n✓ Seeded successfully!\n')
  console.log('  Owner    → owner@demo.com  / password123')
  console.log('  Employee → alice@demo.com  / password123  (Villa + Restaurant)')
  console.log('  Employee → bob@demo.com    / password123  (Restaurant)')
  console.log()
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
