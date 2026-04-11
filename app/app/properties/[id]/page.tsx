'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp, X,
  Camera, ImageIcon, AlertCircle, CheckCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn, statusLabel, statusClass } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

interface ChecklistItem { id: string; label: string; order: number }
interface ChecklistResponse { id: string; checklistItemId: string; checked: boolean; checklistItem: ChecklistItem }
interface Photo { id: string; type: string; url: string }
interface InventoryItem { id: string; name: string; threshold: number | null; order: number }
interface InventoryCount { id: string; inventoryItemId: string; count: number | null; inventoryItem: InventoryItem }

interface Task {
  id: string
  status: string
  notes: string | null
  property: { id: string; name: string }
  checklistResponses: ChecklistResponse[]
  photos: Photo[]
  inventoryCounts: InventoryCount[]
}

interface InventoryTemplate {
  id: string
  enabled: boolean
  items: InventoryItem[]
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function TaskPage() {
  const { id: propertyId } = useParams<{ id: string }>()
  const router = useRouter()

  const [task, setTask] = useState<Task | null>(null)
  const [invTemplate, setInvTemplate] = useState<InventoryTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [clOpen, setClOpen] = useState(true)
  const [photoOpen, setPhotoOpen] = useState(true)
  const [invOpen, setInvOpen] = useState(true)

  const [uploading, setUploading] = useState<Partial<Record<string, boolean>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [notes, setNotes] = useState('')
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Inventory counts stored separately so controlled inputs stay stable ──
  // key: inventoryItemId → string value of the input
  const [counts, setCounts] = useState<Record<string, string>>({})

  const preRef = useRef<HTMLInputElement>(null)
  const postRef = useRef<HTMLInputElement>(null)
  const invRef = useRef<HTMLInputElement>(null)

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchTask = useCallback(async () => {
    try {
      const res = await fetch(`/api/properties/${propertyId}/task`)
      if (!res.ok) { setError('Access denied'); return }
      const data = await res.json()
      setTask(data.task)
      setInvTemplate(data.inventoryTemplate)
      setNotes(data.task?.notes ?? '')

      // Init counts from existing DB data
      const init: Record<string, string> = {}
      for (const c of (data.task?.inventoryCounts ?? []) as InventoryCount[]) {
        if (c.count !== null) init[c.inventoryItemId] = String(c.count)
      }
      setCounts(init)
    } catch {
      setError('Failed to load task')
    } finally {
      setLoading(false)
    }
  }, [propertyId])

  useEffect(() => { fetchTask() }, [fetchTask])

  // Cleanup notes debounce on unmount
  useEffect(() => () => { if (notesTimerRef.current) clearTimeout(notesTimerRef.current) }, [])

  // ── Derived ──────────────────────────────────────────────────────────────

  const prePhotos  = task?.photos.filter((p) => p.type === 'PRE')  ?? []
  const postPhotos = task?.photos.filter((p) => p.type === 'POST') ?? []
  const invPhotos  = task?.photos.filter((p) => p.type === 'INVENTORY') ?? []

  const canEdit   = task?.status === 'OPEN' || task?.status === 'NEEDS_REDO'
  const canSubmit = canEdit && postPhotos.length >= 1 && invPhotos.length >= 1

  // ── Handlers ─────────────────────────────────────────────────────────────

  const toggleCheck = async (res: ChecklistResponse) => {
    if (!task || !canEdit) return
    const next = !res.checked
    setTask((t) => t ? {
      ...t,
      checklistResponses: t.checklistResponses.map((r) =>
        r.id === res.id ? { ...r, checked: next } : r
      ),
    } : t)
    await fetch(`/api/tasks/${task.id}/checklist`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checklistItemId: res.checklistItemId, checked: next }),
    })
  }

  const uploadPhoto = async (file: File, type: 'PRE' | 'POST' | 'INVENTORY') => {
    if (!task) return
    setUploading((u) => ({ ...u, [type]: true }))
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'tasks')
      const upRes = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!upRes.ok) {
        const err = await upRes.json().catch(() => ({}))
        alert(err.error ?? 'Upload failed')
        return
      }
      const { url } = await upRes.json()

      const photoRes = await fetch(`/api/tasks/${task.id}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, url }),
      })
      const { photo } = await photoRes.json()
      setTask((t) => t ? { ...t, photos: [...t.photos, photo] } : t)
    } finally {
      setUploading((u) => ({ ...u, [type]: false }))
    }
  }

  const deletePhoto = async (photoId: string) => {
    if (!task || !canEdit) return
    setTask((t) => t ? { ...t, photos: t.photos.filter((p) => p.id !== photoId) } : t)
    await fetch(`/api/tasks/${task.id}/photos/${photoId}`, { method: 'DELETE' })
  }

  // Inventory count — uses separate `counts` state so controlled inputs stay stable
  const updateCount = async (inventoryItemId: string, value: string) => {
    if (!task || !canEdit) return
    // Update controlled input state immediately
    setCounts((prev) => ({ ...prev, [inventoryItemId]: value }))
    // Persist to DB
    const count = value === '' ? null : Number(value)
    await fetch(`/api/tasks/${task.id}/inventory`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inventoryItemId, count }),
    })
  }

  const handleNotes = (val: string) => {
    setNotes(val)
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current)
    notesTimerRef.current = setTimeout(async () => {
      if (task) {
        await fetch(`/api/tasks/${task.id}/notes`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: val }),
        })
      }
    }, 800)
  }

  const handleSubmit = async () => {
    if (!task || !canSubmit) return
    setSubmitting(true)
    const res = await fetch(`/api/tasks/${task.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
    if (res.ok) {
      setTask((t) => t ? { ...t, status: 'SUBMITTED' } : t)
    } else {
      const d = await res.json()
      alert(d.error ?? 'Submit failed')
    }
    setSubmitting(false)
  }

  // ── UI ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-10 h-10 mx-auto mb-4 text-neutral-300" />
        <p className="text-neutral-500">{error || 'Task not found'}</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.back()}>Go back</Button>
      </div>
    )
  }

  const submitted = task.status === 'SUBMITTED' || task.status === 'APPROVED'
  const needsRedo = task.status === 'NEEDS_REDO'

  // Hint shown on disabled submit button
  const submitHint = !canEdit ? null
    : postPhotos.length < 1 ? 'Add a post-clean photo first'
    : invPhotos.length < 1 ? 'Add an inventory photo first'
    : null

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-36">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-xs text-neutral-400 mb-3 flex items-center gap-1">
          ← Properties
        </button>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{task.property.name}</h1>
            <p className="text-sm text-neutral-500 mt-0.5">Today&apos;s Task</p>
          </div>
          <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full shrink-0', statusClass(task.status))}>
            {statusLabel(task.status)}
          </span>
        </div>

        {needsRedo && (
          <div className="mt-3 p-3 bg-neutral-900 text-white rounded-xl text-sm">
            <p className="font-semibold mb-0.5">Needs Redo</p>
            <p className="text-neutral-300 text-xs">The owner requested changes — fix and re-submit.</p>
          </div>
        )}
      </div>

      {/* ── Checklist Card ─────────────────────────────────────────────── */}
      <SectionCard
        title="Checklist"
        open={clOpen}
        onToggle={() => setClOpen((v) => !v)}
        count={task.checklistResponses.filter((r) => r.checked).length}
        total={task.checklistResponses.length}
      >
        {task.checklistResponses.length === 0 ? (
          <p className="text-sm text-neutral-400">No checklist items set up for this property.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100">
            {task.checklistResponses.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => toggleCheck(r)}
                  disabled={!canEdit}
                  className="w-full flex items-center gap-3 py-3.5 text-left hover:bg-neutral-50 rounded-lg px-1 transition-colors disabled:cursor-default"
                >
                  {r.checked
                    ? <CheckCircle2 className="w-5 h-5 text-black shrink-0" />
                    : <Circle className="w-5 h-5 text-neutral-300 shrink-0" />
                  }
                  <span className={cn('text-sm', r.checked && 'line-through text-neutral-400')}>
                    {r.checklistItem.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* ── Photos Card ────────────────────────────────────────────────── */}
      <SectionCard
        title="Photos"
        open={photoOpen}
        onToggle={() => setPhotoOpen((v) => !v)}
        count={postPhotos.length + prePhotos.length}
        badge={canEdit && postPhotos.length === 0 ? 'Post-clean required' : undefined}
      >
        {/* Pre-clean */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
            Pre-clean <span className="text-neutral-400 font-normal normal-case">(optional)</span>
          </p>
          <PhotoGrid
            photos={prePhotos}
            onDelete={deletePhoto}
            canEdit={canEdit}
            uploading={!!uploading['PRE']}
            onAdd={() => preRef.current?.click()}
          />
          <input
            ref={preRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) uploadPhoto(f, 'PRE')
              e.target.value = ''
            }}
          />
        </div>

        {/* Post-clean */}
        <div>
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
            Post-clean <span className="text-red-400 font-normal normal-case">required</span>
          </p>
          <PhotoGrid
            photos={postPhotos}
            onDelete={deletePhoto}
            canEdit={canEdit}
            uploading={!!uploading['POST']}
            onAdd={() => postRef.current?.click()}
          />
          <input
            ref={postRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) uploadPhoto(f, 'POST')
              e.target.value = ''
            }}
          />
        </div>
      </SectionCard>

      {/* ── Inventory Card ─────────────────────────────────────────────── */}
      <SectionCard
        title="Inventory"
        open={invOpen}
        onToggle={() => setInvOpen((v) => !v)}
        count={invPhotos.length}
        badge={canEdit && invPhotos.length === 0 ? 'Photo required' : undefined}
      >
        {/* Inventory photo */}
        <div className={invTemplate?.enabled && invTemplate.items.length > 0 ? 'mb-5' : ''}>
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
            Proof photo <span className="text-red-400 font-normal normal-case">required</span>
          </p>
          <PhotoGrid
            photos={invPhotos}
            onDelete={deletePhoto}
            canEdit={canEdit}
            uploading={!!uploading['INVENTORY']}
            onAdd={() => invRef.current?.click()}
          />
          <input
            ref={invRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) uploadPhoto(f, 'INVENTORY')
              e.target.value = ''
            }}
          />
        </div>

        {/* Counts table — only if template enabled with items */}
        {invTemplate?.enabled && invTemplate.items.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
              Counts
            </p>
            <div className="flex flex-col gap-1">
              {invTemplate.items.map((item) => {
                const rawVal = counts[item.id] ?? ''
                const numVal = rawVal === '' ? null : Number(rawVal)
                const isLow = item.threshold !== null && numVal !== null && numVal < item.threshold
                return (
                  <div key={item.id} className="flex items-center gap-3 py-2.5 border-b border-neutral-50 last:border-0">
                    <span className="flex-1 text-sm">{item.name}</span>
                    {isLow && (
                      <span className="text-xs font-semibold bg-neutral-900 text-white px-2 py-0.5 rounded-full">
                        Low
                      </span>
                    )}
                    {item.threshold !== null && (
                      <span className="text-xs text-neutral-400">min {item.threshold}</span>
                    )}
                    <input
                      type="number"
                      min={0}
                      disabled={!canEdit}
                      value={rawVal}
                      onChange={(e) => updateCount(item.id, e.target.value)}
                      placeholder="—"
                      className="w-20 text-right h-9 rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-black disabled:bg-neutral-50 disabled:text-neutral-400"
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Notes */}
      <div className="mt-4 bg-white border border-neutral-200 rounded-xl p-5">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Notes</p>
        <textarea
          value={notes}
          onChange={(e) => handleNotes(e.target.value)}
          disabled={!canEdit}
          rows={3}
          placeholder="Any notes for the owner…"
          className="w-full text-sm border border-neutral-200 rounded-lg px-3.5 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-black disabled:bg-neutral-50 disabled:text-neutral-400"
        />
      </div>

      {/* Sticky Submit */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-neutral-100 px-4 py-3 pb-safe">
        {submitted ? (
          <div className="flex items-center justify-center gap-2 py-2 text-sm font-medium text-neutral-600">
            <CheckCheck className="w-5 h-5" />
            Task {task.status === 'APPROVED' ? 'Approved ✓' : 'Submitted — awaiting review'}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {submitHint && (
              <p className="text-xs text-center text-neutral-400">{submitHint}</p>
            )}
            <Button
              size="lg"
              className="w-full"
              onClick={handleSubmit}
              disabled={!canSubmit}
              loading={submitting}
            >
              {submitting ? 'Submitting…' : 'Submit Task'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Section Card ──────────────────────────────────────────────────────────────

function SectionCard({
  title, open, onToggle, count, total, badge, children
}: {
  title: string
  open: boolean
  onToggle: () => void
  count?: number
  total?: number
  badge?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl mb-4 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-neutral-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm">{title}</span>
          {total !== undefined && (
            <span className="text-xs text-neutral-400">{count}/{total}</span>
          )}
          {badge && (
            <span className="text-xs text-red-400 font-medium">{badge}</span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  )
}

// ── Photo Grid ────────────────────────────────────────────────────────────────

function PhotoGrid({
  photos, onDelete, canEdit, uploading, onAdd
}: {
  photos: Photo[]
  onDelete: (id: string) => void
  canEdit: boolean
  uploading: boolean
  onAdd: () => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {photos.map((p) => (
        <div key={p.id} className="relative w-20 h-20 rounded-lg overflow-hidden border border-neutral-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.url} alt="upload" className="w-full h-full object-cover" />
          {canEdit && (
            <button
              onClick={() => onDelete(p.id)}
              className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          )}
        </div>
      ))}

      {canEdit && (
        <button
          onClick={onAdd}
          disabled={uploading}
          className="w-20 h-20 rounded-lg border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-1 text-neutral-400 hover:border-black hover:text-black transition-colors disabled:opacity-50"
        >
          {uploading
            ? <Spinner size="sm" />
            : (
              <>
                <Camera className="w-5 h-5" />
                <span className="text-[10px]">Add</span>
              </>
            )
          }
        </button>
      )}

      {!canEdit && photos.length === 0 && (
        <div className="flex items-center gap-2 text-neutral-400 text-sm py-2">
          <ImageIcon className="w-4 h-4" />
          <span>No photos</span>
        </div>
      )}
    </div>
  )
}
