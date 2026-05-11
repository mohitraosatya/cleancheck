'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  CheckCircle2, Circle, AlertCircle, ImageIcon,
  Building2, User, Calendar, MessageSquare, LogIn, LogOut as LogOutIcon, Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { PageSpinner } from '@/components/ui/spinner'
import { cn, formatDate, formatDateTime, statusClass, statusLabel, levelLabel, levelClass } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

type InventoryLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'FULL'

interface ChecklistItem { id: string; label: string; order: number }
interface ChecklistResponse { id: string; checklistItemId: string; checked: boolean; checklistItem: ChecklistItem }
interface Photo { id: string; type: string; url: string }
interface InventoryItem { id: string; name: string; order: number }
interface InventoryCount { id: string; inventoryItemId: string; level: InventoryLevel | null; inventoryItem: InventoryItem }
interface GuestStay { id: string; guestName: string | null; checkIn: string; checkOut: string; notes: string | null }
interface Assignment { user: { id: string; name: string; email: string } }

interface Task {
  id: string; status: string; notes: string | null
  dateKey: string; submittedAt: string | null
  reviewStatus: string | null; reviewComment: string | null; reviewedAt: string | null
  property: { id: string; name: string; address?: string }
  createdBy: { name: string; email: string }
  checklistResponses: ChecklistResponse[]
  photos: Photo[]
  inventoryCounts: InventoryCount[]
  assignments: Assignment[]
  guestStay: GuestStay | null
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function TaskReviewPage() {
  const { id: taskId } = useParams<{ id: string }>()
  const router = useRouter()

  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [comment, setComment] = useState('')
  const [showReview, setShowReview] = useState(false)
  const [decision, setDecision] = useState<'APPROVED' | 'NEEDS_REDO' | null>(null)

  const fetchTask = useCallback(async () => {
    const res = await fetch(`/api/tasks/${taskId}`)
    if (!res.ok) { setError('Task not found'); setLoading(false); return }
    const data = await res.json()
    setTask(data.task)
    setLoading(false)
  }, [taskId])

  useEffect(() => { fetchTask() }, [fetchTask])

  const submitReview = async () => {
    if (!decision) return
    setReviewing(true)
    await fetch(`/api/tasks/${taskId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, comment }),
    })
    setReviewing(false)
    setShowReview(false)
    fetchTask()
  }

  if (loading) return <PageSpinner />
  if (error || !task) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-10 h-10 mx-auto mb-4 text-neutral-300" />
        <p className="text-neutral-500">{error || 'Not found'}</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.back()}>Go back</Button>
      </div>
    )
  }

  const prePhotos  = task.photos.filter((p: Photo) => p.type === 'PRE')
  const postPhotos = task.photos.filter((p: Photo) => p.type === 'POST')
  const invPhotos  = task.photos.filter((p: Photo) => p.type === 'INVENTORY')
  const checkedCount = task.checklistResponses.filter((r: ChecklistResponse) => r.checked).length
  const canReview = task.status === 'SUBMITTED'

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-32">
      <button onClick={() => router.back()} className="text-xs text-neutral-400 mb-4 flex items-center gap-1">
        ← Tasks
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold">{task.property.name}</h1>
          <p className="text-sm text-neutral-400">{task.dateKey}</p>
        </div>
        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full shrink-0', statusClass(task.status))}>
          {statusLabel(task.status)}
        </span>
      </div>

      {/* Guest stay info */}
      {task.guestStay && (
        <div className="bg-white border border-neutral-200 rounded-xl px-5 py-4 mb-4 flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-2 text-green-700">
            <LogIn className="w-4 h-4" />
            Check-in: {formatDate(task.guestStay.checkIn)}
          </span>
          <span className="flex items-center gap-2 text-red-600">
            <LogOutIcon className="w-4 h-4" />
            Check-out: {formatDate(task.guestStay.checkOut)}
          </span>
          {task.guestStay.guestName && (
            <span className="font-medium text-neutral-700">{task.guestStay.guestName}</span>
          )}
          {task.guestStay.notes && (
            <span className="text-neutral-400 text-xs w-full">{task.guestStay.notes}</span>
          )}
        </div>
      )}

      {/* Meta */}
      <div className="bg-white border border-neutral-200 rounded-xl px-5 py-4 mb-6 grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-neutral-400 shrink-0" />
          <span>{task.createdBy.name}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-neutral-400 shrink-0" />
          <span>{formatDateTime(task.submittedAt)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm col-span-2">
          <Building2 className="w-4 h-4 text-neutral-400 shrink-0" />
          <span className="text-neutral-500">{task.property.address ?? 'No address'}</span>
        </div>
        {task.assignments.length > 0 && (
          <div className="flex items-center gap-2 text-sm col-span-2">
            <Users className="w-4 h-4 text-neutral-400 shrink-0" />
            <span className="text-neutral-600">
              {task.assignments.map((a: Assignment) => a.user.name).join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* Review feedback */}
      {task.reviewStatus && (
        <div className="bg-neutral-900 text-white rounded-xl px-5 py-4 mb-6">
          <p className="text-sm font-semibold mb-1">
            {task.reviewStatus === 'APPROVED' ? 'Approved' : 'Needs Redo'} · {formatDateTime(task.reviewedAt)}
          </p>
          {task.reviewComment && (
            <p className="text-sm text-neutral-300">{task.reviewComment}</p>
          )}
        </div>
      )}

      {/* Checklist */}
      <Section title={`Checklist (${checkedCount}/${task.checklistResponses.length})`}>
        {task.checklistResponses.length === 0 ? (
          <p className="text-sm text-neutral-400">No checklist items</p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100">
            {task.checklistResponses.map((r: ChecklistResponse) => (
              <li key={r.id} className="flex items-center gap-3 py-3">
                {r.checked
                  ? <CheckCircle2 className="w-5 h-5 text-black shrink-0" />
                  : <Circle className="w-5 h-5 text-neutral-300 shrink-0" />
                }
                <span className={cn('text-sm', !r.checked && 'text-neutral-400')}>
                  {r.checklistItem.label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Photos */}
      <Section title={`Post-clean Photos (${postPhotos.length})`}>
        {postPhotos.length === 0
          ? <p className="text-sm text-neutral-400">No post-clean photos</p>
          : <PhotoGrid photos={postPhotos} />
        }
      </Section>

      {prePhotos.length > 0 && (
        <Section title={`Pre-clean Photos (${prePhotos.length})`}>
          <PhotoGrid photos={prePhotos} />
        </Section>
      )}

      <Section title={`Inventory Photos (${invPhotos.length})`}>
        {invPhotos.length === 0
          ? <p className="text-sm text-neutral-400">No inventory photos</p>
          : <PhotoGrid photos={invPhotos} />
        }
      </Section>

      {/* Inventory levels */}
      {task.inventoryCounts.length > 0 && (
        <Section title="Inventory">
          <div className="flex flex-col gap-2">
            {task.inventoryCounts.map((c: InventoryCount) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-neutral-50 last:border-0">
                <span className="text-sm">{c.inventoryItem.name}</span>
                <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', levelClass(c.level))}>
                  {levelLabel(c.level)}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Notes */}
      {task.notes && (
        <Section title="Notes">
          <div className="flex items-start gap-2">
            <MessageSquare className="w-4 h-4 text-neutral-400 mt-0.5 shrink-0" />
            <p className="text-sm text-neutral-700">{task.notes}</p>
          </div>
        </Section>
      )}

      {/* Review actions */}
      {canReview && !showReview && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-neutral-100 px-4 py-3 pb-safe flex gap-3">
          <Button
            variant="secondary" size="lg" className="flex-1"
            onClick={() => { setDecision('NEEDS_REDO'); setShowReview(true) }}
          >
            Needs Redo
          </Button>
          <Button
            size="lg" className="flex-1"
            onClick={() => { setDecision('APPROVED'); setShowReview(true) }}
          >
            Approve
          </Button>
        </div>
      )}

      {showReview && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-neutral-100 px-4 py-4 pb-safe">
          <p className="text-sm font-semibold mb-3">
            {decision === 'APPROVED' ? 'Approve task?' : 'Request redo?'}
          </p>
          <Textarea
            placeholder="Optional comment for the cleaner…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            className="mb-3"
          />
          <div className="flex gap-2">
            <Button variant="secondary" size="md" className="flex-1" onClick={() => setShowReview(false)}>
              Cancel
            </Button>
            <Button size="md" className="flex-1" onClick={submitReview} loading={reviewing}>
              Confirm
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl mb-4 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-neutral-100">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

// ── Photo Grid ────────────────────────────────────────────────────────────────

function PhotoGrid({ photos }: { photos: { id: string; url: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {photos.map((p) => (
        <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.url}
            alt="photo"
            className="w-24 h-24 object-cover rounded-lg border border-neutral-200 hover:opacity-80 transition-opacity"
          />
        </a>
      ))}
      {photos.length === 0 && (
        <div className="flex items-center gap-2 text-neutral-400 text-sm">
          <ImageIcon className="w-4 h-4" />
          <span>None</span>
        </div>
      )}
    </div>
  )
}
