'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Building2, ChevronRight, Trash2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { PageSpinner } from '@/components/ui/spinner'

interface Property {
  id: string
  name: string
  address?: string
  _count?: { assignments: number; tasks: number }
}

interface Me {
  role: string
}

export default function PropertiesPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)

  const [showAdd, setShowAdd] = useState(false)
  const [editProp, setEditProp] = useState<Property | null>(null)
  const [formName, setFormName] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchAll = async () => {
    const [meRes, propsRes] = await Promise.all([
      fetch('/api/auth/me'),
      fetch('/api/properties'),
    ])
    const meData = await meRes.json()
    const propsData = await propsRes.json()
    setMe(meData.user)
    setProperties(propsData.properties ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const openAdd = () => { setFormName(''); setFormAddress(''); setShowAdd(true) }
  const openEdit = (p: Property) => { setEditProp(p); setFormName(p.name); setFormAddress(p.address ?? '') }

  const saveProperty = async () => {
    setSaving(true)
    if (editProp) {
      await fetch(`/api/properties/${editProp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, address: formAddress }),
      })
      setEditProp(null)
    } else {
      await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, address: formAddress }),
      })
      setShowAdd(false)
    }
    setSaving(false)
    fetchAll()
  }

  const deleteProperty = async (id: string) => {
    if (!confirm('Delete this property? All tasks and data will be removed.')) return
    await fetch(`/api/properties/${id}`, { method: 'DELETE' })
    fetchAll()
  }

  if (loading) return <PageSpinner />

  const isOwner = me?.role === 'OWNER'

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Properties</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {isOwner ? `${properties.length} total` : 'Your assigned locations'}
          </p>
        </div>
        {isOwner && (
          <Button onClick={openAdd} size="sm">
            <Plus className="w-4 h-4" />
            Add
          </Button>
        )}
      </div>

      {/* List */}
      {properties.length === 0 ? (
        <div className="text-center py-16 text-neutral-400">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No properties yet</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {properties.map((p) => (
            <li
              key={p.id}
              className="bg-white border border-neutral-200 rounded-xl flex items-center"
            >
              <Link
                href={isOwner ? `/app/properties/${p.id}/setup` : `/app/properties/${p.id}`}
                className="flex-1 flex items-center gap-4 px-5 py-4"
              >
                <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-neutral-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{p.name}</p>
                  {p.address && (
                    <p className="text-xs text-neutral-400 truncate mt-0.5">{p.address}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-300 shrink-0" />
              </Link>

              {isOwner && (
                <div className="flex gap-1 pr-3">
                  <button
                    onClick={() => openEdit(p)}
                    className="p-2 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteProperty(p.id)}
                    className="p-2 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Property">
        <div className="flex flex-col gap-4">
          <Input
            label="Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Beachside Villa"
          />
          <Input
            label="Address (optional)"
            value={formAddress}
            onChange={(e) => setFormAddress(e.target.value)}
            placeholder="123 Ocean Dr"
          />
          <Button onClick={saveProperty} loading={saving} disabled={!formName.trim()} className="w-full">
            Save
          </Button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editProp} onClose={() => setEditProp(null)} title="Edit Property">
        <div className="flex flex-col gap-4">
          <Input
            label="Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />
          <Input
            label="Address (optional)"
            value={formAddress}
            onChange={(e) => setFormAddress(e.target.value)}
          />
          <Button onClick={saveProperty} loading={saving} disabled={!formName.trim()} className="w-full">
            Save
          </Button>
        </div>
      </Modal>
    </div>
  )
}
