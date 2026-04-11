'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, Users, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { PageSpinner } from '@/components/ui/spinner'
import { getInitials } from '@/lib/utils'

interface Property { id: string; name: string }
interface Employee {
  id: string; name: string; email: string
  assignedProperties: { property: Property }[]
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [allProperties, setAllProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)

  // Add/Edit modal
  const [showAdd, setShowAdd] = useState(false)
  const [editEmp, setEditEmp] = useState<Employee | null>(null)
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Assignment modal
  const [assignEmp, setAssignEmp] = useState<Employee | null>(null)
  const [selectedProps, setSelectedProps] = useState<Set<string>>(new Set())
  const [savingAssign, setSavingAssign] = useState(false)

  const fetchAll = useCallback(async () => {
    const [empRes, propRes] = await Promise.all([
      fetch('/api/employees'),
      fetch('/api/properties'),
    ])
    const empData = await empRes.json()
    const propData = await propRes.json()
    setEmployees(empData.employees ?? [])
    setAllProperties(propData.properties ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const openAdd = () => {
    setFormName(''); setFormEmail(''); setFormPassword(''); setFormError('')
    setShowAdd(true)
  }

  const openEdit = (emp: Employee) => {
    setEditEmp(emp); setFormName(emp.name); setFormEmail(emp.email)
    setFormPassword(''); setFormError('')
  }

  const openAssign = (emp: Employee) => {
    setAssignEmp(emp)
    setSelectedProps(new Set(emp.assignedProperties.map((a) => a.property.id)))
  }

  const saveEmployee = async () => {
    setSaving(true); setFormError('')
    try {
      if (editEmp) {
        const res = await fetch(`/api/employees/${editEmp.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formName, password: formPassword || undefined }),
        })
        if (!res.ok) { const d = await res.json(); setFormError(d.error); return }
        setEditEmp(null)
      } else {
        const res = await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formName, email: formEmail, password: formPassword }),
        })
        if (!res.ok) { const d = await res.json(); setFormError(d.error); return }
        setShowAdd(false)
      }
      fetchAll()
    } finally {
      setSaving(false)
    }
  }

  const deleteEmployee = async (id: string) => {
    if (!confirm('Delete this employee? Their task history will remain.')) return
    await fetch(`/api/employees/${id}`, { method: 'DELETE' })
    fetchAll()
  }

  const saveAssignments = async () => {
    if (!assignEmp) return
    setSavingAssign(true)
    await fetch(`/api/employees/${assignEmp.id}/assignments`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyIds: [...selectedProps] }),
    })
    setSavingAssign(false)
    setAssignEmp(null)
    fetchAll()
  }

  const toggleProp = (id: string) => {
    setSelectedProps((s) => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (loading) return <PageSpinner />

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{employees.length} total</p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      {employees.length === 0 ? (
        <div className="text-center py-16 text-neutral-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No employees yet</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {employees.map((emp) => (
            <li key={emp.id} className="bg-white border border-neutral-200 rounded-xl px-5 py-4 flex items-center gap-4">
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {getInitials(emp.name)}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{emp.name}</p>
                <p className="text-xs text-neutral-400 truncate">{emp.email}</p>
                {emp.assignedProperties.length > 0 && (
                  <p className="text-xs text-neutral-500 mt-1">
                    {emp.assignedProperties.map((a) => a.property.name).join(', ')}
                  </p>
                )}
              </div>
              {/* Actions */}
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => openAssign(emp)}
                  className="p-2 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                  title="Manage property assignments"
                >
                  <Building2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openEdit(emp)}
                  className="p-2 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteEmployee(emp.id)}
                  className="p-2 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Employee">
        <div className="flex flex-col gap-4">
          <Input label="Name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Alice Cleaner" />
          <Input label="Email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="alice@example.com" />
          <Input label="Password" type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="Min 8 characters" />
          {formError && <p className="text-sm text-red-500">{formError}</p>}
          <Button onClick={saveEmployee} loading={saving} disabled={!formName || !formEmail || !formPassword} className="w-full">
            Create Employee
          </Button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editEmp} onClose={() => setEditEmp(null)} title="Edit Employee">
        <div className="flex flex-col gap-4">
          <Input label="Name" value={formName} onChange={(e) => setFormName(e.target.value)} />
          <Input label="New Password (leave blank to keep)" type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="Leave blank to keep current" />
          {formError && <p className="text-sm text-red-500">{formError}</p>}
          <Button onClick={saveEmployee} loading={saving} disabled={!formName} className="w-full">
            Save Changes
          </Button>
        </div>
      </Modal>

      {/* Assignments Modal */}
      <Modal open={!!assignEmp} onClose={() => setAssignEmp(null)} title={`Assign Properties — ${assignEmp?.name}`}>
        <div className="flex flex-col gap-3">
          {allProperties.map((p) => (
            <label key={p.id} className="flex items-center gap-3 cursor-pointer py-2">
              <input
                type="checkbox"
                checked={selectedProps.has(p.id)}
                onChange={() => toggleProp(p.id)}
                className="w-4 h-4 rounded border-neutral-300 accent-black"
              />
              <span className="text-sm">{p.name}</span>
            </label>
          ))}
          {allProperties.length === 0 && (
            <p className="text-sm text-neutral-400">No properties yet. Add properties first.</p>
          )}
          <Button onClick={saveAssignments} loading={savingAssign} className="w-full mt-2">
            Save Assignments
          </Button>
        </div>
      </Modal>
    </div>
  )
}
