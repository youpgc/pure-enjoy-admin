import { useState } from 'react'

export function useEditModal<T>() {
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<T | null>(null)
  const open = (record: T) => { setEditingRecord(record); setEditModalOpen(true) }
  const close = () => { setEditModalOpen(false); setEditingRecord(null) }
  return { editModalOpen, editingRecord, open, close, setEditModalOpen, setEditingRecord }
}
