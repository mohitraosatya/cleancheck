# CleanCheck

Cleaning verification web app — checklist, photos & inventory. Replaces WhatsApp for cleaning proof.

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS v4
- **PostgreSQL** + **Prisma** ORM
- **JWT** auth (httpOnly cookie, 7-day expiry)
- **Local file storage** in `/public/uploads/` (swap `lib/storage.ts` for S3)

---

## Local Setup

### 1. Install

```bash
npm install
```

### 2. Environment

```bash
# .env.local (already created)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cleancheck"
JWT_SECRET="change-me-in-production-use-32-plus-chars-minimum"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Database

```bash
npx prisma db push      # push schema (no migration files)
npm run db:seed         # load demo data
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Owner | owner@demo.com | password123 |
| Employee | alice@demo.com | password123 |
| Employee | bob@demo.com | password123 |

---

## Roles

### Owner
- Dashboard: recent submissions + low inventory flags
- Properties: CRUD, checklist template editor, inventory template editor
- Employees: CRUD + property assignment
- Tasks: filter by property / status / date, review with Approve / Needs Redo
- Notifications: bell icon with unread count (30s polling)

### Employee
- Sees only assigned properties
- Opens today's task → 3 collapsible cards: Checklist, Photos, Inventory
- Camera capture on mobile (`capture="environment"`)
- Sticky submit button (enabled when post-clean ≥ 1 photo + inventory ≥ 1 photo)

---

## Submit Requirements

| Requirement | Mandatory |
|-------------|-----------|
| ≥ 1 post-clean photo | Yes |
| ≥ 1 inventory proof photo | Yes |
| Checklist items checked | No |

---

## File Storage

Dev: files stored in `public/uploads/`. To use S3, implement `StorageAdapter` in `lib/storage.ts`:

```typescript
class S3Storage implements StorageAdapter {
  async save(file: File, folder: string): Promise<string> { /* PutObjectCommand */ }
  async delete(url: string): Promise<void> { /* DeleteObjectCommand */ }
}
export const storage: StorageAdapter = new S3Storage()
```

---

## Deploy

- **Frontend + API**: Vercel
- **Database**: Neon or Supabase Postgres (set `DATABASE_URL`)
- **Files**: swap `LocalStorage` → S3 adapter in `lib/storage.ts` (Vercel filesystem is read-only)
- Set `JWT_SECRET` (32+ chars) in Vercel environment variables
