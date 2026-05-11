'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, Upload, Trash2, X, LogIn, LogOut as LogOutIcon, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { PageSpinner } from '@/components/ui/spinner'
import { cn, formatDate } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

interface Property { id: string; name: string }
interface Employee { id: string; name: string; email: string }

interface Stay {
  id: string
  guestName: string | null
  checkIn: string
  checkOut: string
  notes: string | null
  property: Property
  task: { id: string; status: string; dateKey: string; assignments: { user: { id: string; name: string } }[] } | null
}

interface CsvRow {
  propertyName: string
  guestName: string
  checkIn: string
  checkOut: string
  notes: string
  error?: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

// ── Helpers ──────────────────────────────────────────────────────────────────

function toDateKey(d: Date) {
  return d.toISOString().split('T')[0]
}

function isoToLocal(iso: string) {
  return new Date(iso).toISOString().split('T')[0]
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length === 0) return []
  const header = lines[0].toLowerCase()
  const isHeaderRow = header.includes('property') || header.includes('check')
  const dataLines = isHeaderRow ? lines.slice(1) : lines
  return dataLines.map((line) => {
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
    return {
      propertyName: cols[0] ?? '',
      guestName: cols[1] ?? '',
      checkIn: cols[2] ?? '',
      checkOut: cols[3] ?? '',
      notes: cols[4] ?? '',
    }
  })
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0-indexed

  const [properties, setProperties] = useState<Property[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [stays, setStays] = useState<Stay[]>([])
  const [loading, setLoading] = useState(true)

  // Add stay modal
  const [showAdd, setShowAdd] = useState(false)
  const [addPropertyId, setAddPropertyId] = useState('')
  const [addGuestName, setAddGuestName] = useState('')
  const [addCheckIn, setAddCheckIn] = useState('')
  const [addCheckOut, setAddCheckOut] = useState('')
  const [addNotes, setAddNotes] = useState('')
  const [addUserIds, setAddUserIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [addError, setAddError] = useState('')

  // CSV import modal
  const [showCsv, setShowCsv] = useState(false)
  const [csvText, setCsvText] = useState('')
  const [csvRows, setCsvRows] = useState<CsvRow[]>([])
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<{ row: number; ok: boolean; error?: string }[]>([])

  // Selected day detail
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const fetchStays = useCallback(async () => {
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
    const res = await fetch(`/api/stays?month=${monthStr}`)
    const data = await res.json()
    setStays(data.stays ?? [])
  }, [year, month])

  const fetchBase = useCallback(async () => {
    const [propsRes, empRes] = await Promise.all([
      fetch('/api/properties'),
      fetch('/api/employees'),
    ])
    const propsData = await propsRes.json()
    const empData = await empRes.json()
    setProperties(propsData.properties ?? [])
    setEmployees(empData.employees ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchBase() }, [fetchBase])
  useEffect(() => { fetchStays() }, [fetchStays])

  // Calendar grid
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  // Map dateKey → { checkIns, checkOuts }
  const dayMap = new Map<string, { checkIns: Stay[]; checkOuts: Stay[] }>()
  for (const s of stays) {
    const ciKey = isoToLocal(s.checkIn)
    const coKey = isoToLocal(s.checkOut)
    if (!dayMap.has(ciKey)) dayMap.set(ciKey, { checkIns: [], checkOuts: [] })
    if (!dayMap.has(coKey)) dayMap.set(coKey, { checkIns: [], checkOuts: [] })
    dayMap.get(ciKey)!.checkIns.push(s)
    dayMap.get(coKey)!.checkOuts.push(s)
  }

  const openAdd = (dateStr?: string) => {
    setAddPropertyId(properties[0]?.id ?? '')
    setAddGuestName('')
    setAddCheckIn(dateStr ?? '')
    setAddCheckOut('')
    setAddNotes('')
    setAddUserIds([])
    setAddError('')
    setShowAdd(true)
  }

  const saveStay = async () => {
    if (!addPropertyId || !addCheckIn || !addCheckOut) {
      setAddError('Property, check-in and check-out are required')
      return
    }
    if (addCheckOut <= addCheckIn) {
      setAddError('Check-out must be after check-in')
      return
    }
    setSaving(true)
    setAddError('')
    const res = await fetch('/api/stays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        propertyId: addPropertyId,
        guestName: addGuestName,
        checkIn: addCheckIn,
        checkOut: addCheckOut,
        notes: addNotes,
        assignedUserIds: addUserIds,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setShowAdd(false)
      fetchStays()
    } else {
      const d = await res.json()
      setAddError(d.error ?? 'Failed to save')
    }
  }

  const deleteStay = async (id: string) => {
    if (!confirm('Delete this stay? The linked cleaning task will remain.')) return
    await fetch(`/api/stays/${id}`, { method: 'DELETE' })
    fetchStays()
  }

  const toggleEmployee = (id: string) => {
    setAddUserIds((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    )
  }

  // CSV parsing
  const handleCsvChange = (text: string) => {
    setCsvText(text)
    setImportResults([])
    if (text.trim()) {
      setCsvRows(parseCsv(text))
    } else {
      setCsvRows([])
    }
  }

  const handleCsvFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => handleCsvChange(e.target?.result as string ?? '')
    reader.readAsText(file)
  }

  const importCsv = async () => {
    if (csvRows.length === 0) return
    setImporting(true)
    const res = await fetch('/api/stays/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: csvRows }),
    })
    const data = await res.json()
    setImportResults(data.results ?? [])
    setImporting(false)
    if (data.results?.every((r: { ok: boolean }) => r.ok)) {
      setTimeout(() => {
        setShowCsv(false)
        setCsvText('')
        setCsvRows([])
        setImportResults([])
        fetchStays()
      }, 1500)
    } else {
      fetchStays()
    }
  }

  if (loading) return <PageSpinner />

  const selectedDayStays = selectedDay
    ? stays.filter((s) => isoToLocal(s.checkIn) === selectedDay || isoToLocal(s.checkOut) === selectedDay)
    : []

  // Upcoming stays (next 30 days)
  const upcomingCutoff = new Date()
  upcomingCutoff.setDate(upcomingCutoff.getDate() + 30)
  const upcoming = stays
    .filter((s) => new Date(s.checkOut) >= today && new Date(s.checkIn) <= upcomingCutoff)
    .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime())

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Guest check-in & check-out schedule</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowCsv(true)}>
            <Upload className="w-4 h-4" />
            Import CSV
          </Button>
          <Button size="sm" onClick={() => openAdd()}>
            <Plus className="w-4 h-4" />
            Add Stay
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_300px] gap-6">
        {/* ── Calendar ────────────────────────────────────────────────── */}
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-sm">{MONTHS[month]} {year}</span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-neutral-100">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-neutral-400 py-2">{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="border-b border-r border-neutral-50 min-h-[72px]" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1
              const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
              const info = dayMap.get(dateKey)
              const isToday = dateKey === toDateKey(today)
              const isSelected = dateKey === selectedDay

              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDay(isSelected ? null : dateKey)}
                  className={cn(
                    'border-b border-r border-neutral-50 min-h-[72px] p-1.5 text-left transition-colors',
                    isSelected ? 'bg-black text-white' : 'hover:bg-neutral-50',
                    (firstDay + i + 1) % 7 === 0 && 'border-r-0'
                  )}
                >
                  <span className={cn(
                    'text-xs font-semibold block mb-1',
                    isToday && !isSelected && 'bg-black text-white rounded-full w-5 h-5 flex items-center justify-center',
                    isSelected && 'text-white'
                  )}>
                    {dayNum}
                  </span>
                  {info?.checkIns.map((s) => (
                    <div key={`ci-${s.id}`} className="flex items-center gap-0.5 mb-0.5">
                      <LogIn className="w-2.5 h-2.5 text-green-600 shrink-0" />
                      <span className={cn('text-[9px] truncate', isSelected ? 'text-green-300' : 'text-green-700')}>
                        {s.guestName || s.property.name}
                      </span>
                    </div>
                  ))}
                  {info?.checkOuts.map((s) => (
                    <div key={`co-${s.id}`} className="flex items-center gap-0.5 mb-0.5">
                      <LogOutIcon className="w-2.5 h-2.5 text-red-500 shrink-0" />
                      <span className={cn('text-[9px] truncate', isSelected ? 'text-red-300' : 'text-red-600')}>
                        {s.guestName || s.property.name}
                      </span>
                    </div>
                  ))}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Legend */}
          <div className="bg-white border border-neutral-200 rounded-xl px-4 py-3 flex gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-green-700">
              <LogIn className="w-3 h-3" /> Check-in
            </span>
            <span className="flex items-center gap-1.5 text-red-600">
              <LogOutIcon className="w-3 h-3" /> Check-out
            </span>
          </div>

          {/* Selected day detail */}
          {selectedDay && (
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
                <span className="text-sm font-semibold">{formatDate(selectedDay)}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => openAdd(selectedDay)}
                    className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 transition-colors"
                    title="Add stay on this day"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setSelectedDay(null)} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {selectedDayStays.length === 0 ? (
                <p className="text-xs text-neutral-400 px-4 py-3">No stays on this day.</p>
              ) : (
                <div className="divide-y divide-neutral-50">
                  {selectedDayStays.map((s) => (
                    <StayCard key={s.id} stay={s} selectedDay={selectedDay} onDelete={deleteStay} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Upcoming stays */}
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-100">
              <span className="text-sm font-semibold">Upcoming (30 days)</span>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-xs text-neutral-400 px-4 py-3">No upcoming stays.</p>
            ) : (
              <div className="divide-y divide-neutral-50 max-h-96 overflow-y-auto">
                {upcoming.map((s) => (
                  <StayCard key={s.id} stay={s} onDelete={deleteStay} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Add Stay Modal ───────────────────────────────────────────────── */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Guest Stay">
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Property</label>
            <select
              value={addPropertyId}
              onChange={(e) => setAddPropertyId(e.target.value)}
              className="w-full h-10 rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <Input
            label="Guest name (optional)"
            value={addGuestName}
            onChange={(e) => setAddGuestName(e.target.value)}
            placeholder="John Doe"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Check-in</label>
              <input
                type="date"
                value={addCheckIn}
                onChange={(e) => setAddCheckIn(e.target.value)}
                className="w-full h-10 rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Check-out</label>
              <input
                type="date"
                value={addCheckOut}
                onChange={(e) => setAddCheckOut(e.target.value)}
                className="w-full h-10 rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>

          <Input
            label="Notes (optional)"
            value={addNotes}
            onChange={(e) => setAddNotes(e.target.value)}
            placeholder="Early check-out, 10am"
          />

          {/* Assign employees */}
          {employees.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-2">
                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Assign cleaners</span>
              </label>
              <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
                {employees.map((e) => (
                  <label key={e.id} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addUserIds.includes(e.id)}
                      onChange={() => toggleEmployee(e.id)}
                      className="rounded"
                    />
                    <span className="text-sm">{e.name}</span>
                    <span className="text-xs text-neutral-400">{e.email}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {addError && <p className="text-xs text-red-500">{addError}</p>}

          <Button onClick={saveStay} loading={saving} disabled={!addPropertyId || !addCheckIn || !addCheckOut} className="w-full">
            Save Stay &amp; Create Cleaning Task
          </Button>
        </div>
      </Modal>

      {/* ── CSV Import Modal ─────────────────────────────────────────────── */}
      <Modal open={showCsv} onClose={() => { setShowCsv(false); setCsvText(''); setCsvRows([]); setImportResults([]) }} title="Import from CSV">
        <div className="flex flex-col gap-4">
          <div className="bg-neutral-50 rounded-lg px-4 py-3 text-xs text-neutral-600">
            <p className="font-semibold mb-1">CSV format (one stay per row):</p>
            <code className="font-mono">property_name, guest_name, check_in, check_out, notes</code>
            <p className="mt-1 text-neutral-400">Dates: YYYY-MM-DD · First row can be a header</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Upload file or paste CSV</label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvFile(f) }}
              className="block w-full text-xs text-neutral-500 mb-2"
            />
            <textarea
              value={csvText}
              onChange={(e) => handleCsvChange(e.target.value)}
              rows={5}
              placeholder="Paste CSV here…"
              className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-black font-mono"
            />
          </div>

          {csvRows.length > 0 && importResults.length === 0 && (
            <div className="border border-neutral-200 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-neutral-50 text-xs font-semibold text-neutral-500">
                Preview — {csvRows.length} row{csvRows.length !== 1 ? 's' : ''}
              </div>
              <div className="divide-y divide-neutral-100 max-h-48 overflow-y-auto">
                {csvRows.map((r, i) => (
                  <div key={i} className="px-3 py-2 text-xs">
                    <span className="font-medium">{r.propertyName}</span>
                    {r.guestName && <span className="text-neutral-500"> · {r.guestName}</span>}
                    <span className="text-neutral-400 ml-1">{r.checkIn} → {r.checkOut}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {importResults.length > 0 && (
            <div className="border border-neutral-200 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-neutral-50 text-xs font-semibold text-neutral-500">Import results</div>
              <div className="divide-y divide-neutral-100 max-h-48 overflow-y-auto">
                {importResults.map((r) => (
                  <div key={r.row} className={cn('px-3 py-2 text-xs flex items-center gap-2', r.ok ? 'text-green-700' : 'text-red-600')}>
                    <span>Row {r.row}:</span>
                    <span>{r.ok ? 'Imported' : r.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={importCsv}
            loading={importing}
            disabled={csvRows.length === 0}
            className="w-full"
          >
            Import {csvRows.length > 0 ? `${csvRows.length} stay${csvRows.length !== 1 ? 's' : ''}` : ''}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

// ── Stay Card ─────────────────────────────────────────────────────────────────

function StayCard({
  stay, selectedDay, onDelete,
}: {
  stay: Stay
  selectedDay?: string
  onDelete: (id: string) => void
}) {
  const ciKey = isoToLocal(stay.checkIn)
  const coKey = isoToLocal(stay.checkOut)

  return (
    <div className="px-4 py-3 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate">{stay.property.name}</p>
        {stay.guestName && <p className="text-xs text-neutral-500">{stay.guestName}</p>}
        <div className="flex items-center gap-2 mt-1">
          {selectedDay === ciKey || !selectedDay ? (
            <span className="flex items-center gap-1 text-[10px] text-green-700">
              <LogIn className="w-2.5 h-2.5" />{formatDate(stay.checkIn)}
            </span>
          ) : null}
          {selectedDay === coKey || !selectedDay ? (
            <span className="flex items-center gap-1 text-[10px] text-red-600">
              <LogOutIcon className="w-2.5 h-2.5" />{formatDate(stay.checkOut)}
            </span>
          ) : null}
        </div>
        {stay.task?.assignments && stay.task.assignments.length > 0 && (
          <p className="text-[10px] text-neutral-400 mt-0.5">
            {stay.task.assignments.map((a) => a.user.name).join(', ')}
          </p>
        )}
      </div>
      <button
        onClick={() => onDelete(stay.id)}
        className="p-1.5 rounded text-neutral-300 hover:text-red-500 transition-colors shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
