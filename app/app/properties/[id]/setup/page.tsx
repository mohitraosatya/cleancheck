'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Plus, Trash2, ClipboardList, Package, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageSpinner } from '@/components/ui/spinner'

interface ChecklistItem { id: string; label: string; order: number }
interface InventoryItem { id: string; name: string; order: number }
interface SetupData {
  checklist: { id: string; items: ChecklistItem[] } | null
  inventory: { id: string; enabled: boolean; items: InventoryItem[] } | null
}

export default function SetupPage() {
  const { id: propertyId } = useParams<{ id: string }>()
  const router = useRouter()

  const [data, setData] = useState<SetupData | null>(null)
  const [loading, setLoading] = useState(true)
  const [propName, setPropName] = useState('')

  const [newItem, setNewItem] = useState('')
  const [addingCL, setAddingCL] = useState(false)

  const [newInvName, setNewInvName] = useState('')
  const [addingINV, setAddingINV] = useState(false)

  const fetchData = useCallback(async () => {
    const [setupRes, propRes] = await Promise.all([
      fetch(`/api/properties/${propertyId}/setup`),
      fetch(`/api/properties/${propertyId}`),
    ])
    const setup = await setupRes.json()
    const prop = await propRes.json()
    setData(setup)
    setPropName(prop.property?.name ?? '')
    setLoading(false)
  }, [propertyId])

  useEffect(() => { fetchData() }, [fetchData])

  const call = async (body: Record<string, unknown>) => {
    await fetch(`/api/properties/${propertyId}/setup`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    fetchData()
  }

  const addChecklistItem = async () => {
    if (!newItem.trim()) return
    setAddingCL(true)
    await call({ type: 'checklist', action: 'add', label: newItem })
    setNewItem('')
    setAddingCL(false)
  }

  const deleteChecklistItem = (itemId: string) => call({ type: 'checklist', action: 'delete', itemId })

  const toggleInventory = (enabled: boolean) => call({ type: 'inventory', action: 'toggle', enabled })

  const addInventoryItem = async () => {
    if (!newInvName.trim()) return
    setAddingINV(true)
    await call({ type: 'inventory', action: 'add', name: newInvName })
    setNewInvName('')
    setAddingINV(false)
  }

  const deleteInventoryItem = (itemId: string) => call({ type: 'inventory', action: 'delete', itemId })

  if (loading) return <PageSpinner />

  const inv = data?.inventory
  const cl = data?.checklist

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <button onClick={() => router.back()} className="text-xs text-neutral-400 mb-4 flex items-center gap-1">
        ← Properties
      </button>

      <h1 className="text-2xl font-bold mb-1">{propName}</h1>
      <p className="text-sm text-neutral-500 mb-8">Setup checklist &amp; inventory templates</p>

      {/* ── Checklist Template ─────────────────────────────────────────── */}
      <section className="bg-white border border-neutral-200 rounded-xl mb-6">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-100">
          <ClipboardList className="w-5 h-5 text-neutral-500" />
          <h2 className="font-semibold text-sm">Checklist Template</h2>
          <span className="text-xs text-neutral-400 ml-auto">{cl?.items.length ?? 0} items</span>
        </div>

        <div className="px-5 py-4">
          {cl?.items.length ? (
            <ul className="flex flex-col gap-1 mb-4">
              {cl.items.map((item: ChecklistItem) => (
                <li key={item.id} className="flex items-center gap-2 py-2 border-b border-neutral-50 last:border-0">
                  <span className="flex-1 text-sm">{item.label}</span>
                  <button
                    onClick={() => deleteChecklistItem(item.id)}
                    className="p-1.5 rounded text-neutral-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-400 mb-4">No items yet. Add your first checklist item.</p>
          )}

          <div className="flex gap-2">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="e.g. Vacuum all floors"
              onKeyDown={(e) => { if (e.key === 'Enter') addChecklistItem() }}
              className="flex-1"
            />
            <Button size="sm" onClick={addChecklistItem} loading={addingCL} disabled={!newItem.trim()}>
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>
        </div>
      </section>

      {/* ── Inventory Template ─────────────────────────────────────────── */}
      <section className="bg-white border border-neutral-200 rounded-xl">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-100">
          <Package className="w-5 h-5 text-neutral-500" />
          <h2 className="font-semibold text-sm">Inventory Template</h2>
          <button
            onClick={() => toggleInventory(!inv?.enabled)}
            className="ml-auto text-neutral-500 hover:text-black transition-colors"
          >
            {inv?.enabled
              ? <ToggleRight className="w-6 h-6 text-black" />
              : <ToggleLeft className="w-6 h-6" />
            }
          </button>
        </div>

        <div className="px-5 py-4">
          {!inv?.enabled ? (
            <p className="text-sm text-neutral-400">
              Enable the toggle above to add inventory items. Cleaners will report each item as None, Low, Medium, or Full.
            </p>
          ) : (
            <>
              {inv.items.length > 0 ? (
                <ul className="flex flex-col gap-1 mb-4">
                  {inv.items.map((item: InventoryItem) => (
                    <li key={item.id} className="flex items-center gap-2 py-2.5 border-b border-neutral-50 last:border-0">
                      <span className="flex-1 text-sm">{item.name}</span>
                      <button
                        onClick={() => deleteInventoryItem(item.id)}
                        className="p-1.5 rounded text-neutral-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-neutral-400 mb-4">No items yet.</p>
              )}

              <div className="flex gap-2">
                <Input
                  value={newInvName}
                  onChange={(e) => setNewInvName(e.target.value)}
                  placeholder="Item name (e.g. Toilet paper)"
                  className="flex-1"
                  onKeyDown={(e) => { if (e.key === 'Enter') addInventoryItem() }}
                />
                <Button size="sm" onClick={addInventoryItem} loading={addingINV} disabled={!newInvName.trim()}>
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </div>
              <p className="text-xs text-neutral-400 mt-2">
                Cleaners will set each item to None, Low, Medium, or Full when completing a task.
              </p>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
