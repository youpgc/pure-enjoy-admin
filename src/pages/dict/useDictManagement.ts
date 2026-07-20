// 字典管理页数据/操作逻辑 Hook（从 DictManagement.tsx 抽取，行为保持）
import { useState, useEffect, useCallback, useMemo } from 'react'
import { message, Form } from 'antd'
import { BaseService, handleApiError } from '../../utils/apiClient'
import { usePagination } from '../../hooks/usePagination'
import { useMounted } from '../../hooks/useMounted'
import type { DictType, DictItem } from './types'

export function useDictManagement() {
  const mountedRef = useMounted()
  // 字典类型状态
  const [dictTypes, setDictTypes] = useState<DictType[]>([])
  const [typeLoading, setTypeLoading] = useState(false)
  const [typeSearchKeyword, setTypeSearchKeyword] = useState('')
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null)
  const { pagination: typePagination, resetPage: resetTypePage, setTotal: setTypeTotal, tablePagination: typeTablePagination } = usePagination()

  // 字典类型弹窗状态
  const [typeModalVisible, setTypeModalVisible] = useState(false)
  const [editingType, setEditingType] = useState<DictType | null>(null)
  const [typeForm] = Form.useForm()
  const [savingType, setSavingType] = useState(false)

  // 字典项状态
  const [dictItems, setDictItems] = useState<DictItem[]>([])
  const [itemLoading, setItemLoading] = useState(false)
  const [itemSearchKeyword, setItemSearchKeyword] = useState('')
  const { pagination: itemPagination, resetPage: resetItemPage, setTotal: setItemTotal, tablePagination: itemTablePagination } = usePagination()

  // 字典项弹窗状态
  const [itemModalVisible, setItemModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState<DictItem | null>(null)
  const [itemForm] = Form.useForm()
  const [savingItem, setSavingItem] = useState(false)

  // 使用 useMemo 缓存 Service 实例，避免每次渲染重新创建导致 useEffect 无限循环
  const typeService = useMemo(
    () => new BaseService<DictType>('dict_types', {
      defaultOrder: { column: 'sort_order', ascending: true },
    }),
    []
  )
  const itemService = useMemo(
    () => new BaseService<DictItem>('dict_items', {
      defaultOrder: { column: 'sort_order', ascending: true },
    }),
    []
  )

  // ==================== 字典类型操作 ====================

  const loadDictTypes = useCallback(async () => {
    setTypeLoading(true)
    try {
      const result = await typeService.paginate(typePagination.current, typePagination.pageSize, (q) => {
        if (typeSearchKeyword) {
          return q.or(`code.ilike.%${typeSearchKeyword}%,name.ilike.%${typeSearchKeyword}%`)
        }
        return q
      })
      if (!result.success) {
        handleApiError(result.errorMessage, 'DictManagement-加载字典类型')
        return
      }
      const types = result.data?.data || []
      if (!mountedRef.current) return
      setDictTypes(types)
      setTypeTotal(result.data?.total || 0)
      // 如果没有选中类型，默认选中第一个
      if (!selectedTypeId && types.length > 0 && types[0]) {
        setSelectedTypeId(types[0].id)
      }
      // 如果选中的类型已被删除，切换到第一个
      if (selectedTypeId && types.length > 0 && !types.find(t => t.id === selectedTypeId) && types[0]) {
        setSelectedTypeId(types[0].id)
      }
      // 如果所有类型都被删除
      if (types.length === 0) {
        setSelectedTypeId(null)
      }
    } catch (error) {
      handleApiError(error, 'DictManagement-加载字典类型')
    } finally {
      setTypeLoading(false)
    }
  }, [typeSearchKeyword, selectedTypeId, typePagination.current, typePagination.pageSize, typeService, setTypeTotal])

  // 加载字典项
  const loadDictItems = useCallback(async () => {
    if (!selectedTypeId) {
      setDictItems([])
      return
    }
    setItemLoading(true)
    try {
      const result = await itemService.paginate(itemPagination.current, itemPagination.pageSize, (q) => {
        let filtered = q.eq('type_id', selectedTypeId)
        if (itemSearchKeyword) {
          filtered = filtered.or(`code.ilike.%${itemSearchKeyword}%,label.ilike.%${itemSearchKeyword}%`)
        }
        return filtered
      })
      if (!result.success) {
        handleApiError(result.errorMessage, 'DictManagement-加载字典项')
        return
      }
      if (!mountedRef.current) return
      setDictItems(result.data?.data || [])
      setItemTotal(result.data?.total || 0)
    } catch (error) {
      handleApiError(error, 'DictManagement-加载字典项')
    } finally {
      setItemLoading(false)
    }
  }, [selectedTypeId, itemSearchKeyword, itemPagination.current, itemPagination.pageSize, itemService, setItemTotal])

  useEffect(() => {
    loadDictTypes()
  }, [loadDictTypes])

  useEffect(() => {
    loadDictItems()
  }, [loadDictItems])

  // 类型搜索
  const handleTypeSearch = () => {
    resetTypePage()
    loadDictTypes()
  }

  // 字典项搜索
  const handleItemSearch = () => {
    resetItemPage()
    loadDictItems()
  }

  // 选中类型行
  const handleSelectType = (record: DictType) => {
    setSelectedTypeId(record.id)
    setItemSearchKeyword('')
    resetItemPage()
  }

  // 打开新增类型弹窗
  const handleAddType = () => {
    setEditingType(null)
    typeForm.resetFields()
    typeForm.setFieldsValue({ sort_order: 0, is_active: true })
    setTypeModalVisible(true)
  }

  // 打开编辑类型弹窗
  const handleEditType = (record: DictType) => {
    setEditingType(record)
    typeForm.setFieldsValue({
      code: record.code,
      name: record.name,
      description: record.description,
      sort_order: record.sort_order,
      is_active: record.is_active,
    })
    setTypeModalVisible(true)
  }

  // 删除类型
  const handleDeleteType = async (id: string) => {
    try {
      const result = await typeService.delete(id)
      if (!result.success) {
        handleApiError(result.errorMessage, 'DictManagement-删除字典类型')
        return
      }
      message.success('删除成功')
      loadDictTypes()
    } catch (error) {
      handleApiError(error, 'DictManagement-删除字典类型')
    }
  }

  // 保存类型
  const handleSaveType = async () => {
    if (savingType) return
    try {
      setSavingType(true)
      const values = await typeForm.validateFields()
      if (editingType) {
        const result = await typeService.update(editingType.id, {
          ...values,
        })
        if (!result.success) {
          handleApiError(result.errorMessage, 'DictManagement-更新字典类型')
          return
        }
        message.success('更新成功')
      } else {
        const result = await typeService.create({
          ...values,
        })
        if (!result.success) {
          handleApiError(result.errorMessage, 'DictManagement-创建字典类型')
          return
        }
        message.success('创建成功')
      }
      setTypeModalVisible(false)
      setEditingType(null)
      typeForm.resetFields()
      loadDictTypes()
    } catch (error) {
      handleApiError(error, 'DictManagement-保存字典类型')
    } finally {
      setSavingType(false)
    }
  }

  // ==================== 字典项操作 ====================

  // 打开新增字典项弹窗
  const handleAddItem = () => {
    if (!selectedTypeId) {
      message.warning('请先选择一个字典类型')
      return
    }
    setEditingItem(null)
    itemForm.resetFields()
    itemForm.setFieldsValue({
      type_id: selectedTypeId,
      sort_order: 0,
      is_default: false,
      is_active: true,
    })
    setItemModalVisible(true)
  }

  // 打开编辑字典项弹窗
  const handleEditItem = (record: DictItem) => {
    setEditingItem(record)
    itemForm.setFieldsValue({
      code: record.code,
      label: record.label,
      value: record.value,
      sort_order: record.sort_order,
      is_default: record.is_default,
      is_active: record.is_active,
    })
    setItemModalVisible(true)
  }

  // 删除字典项
  const handleDeleteItem = async (id: string) => {
    try {
      const result = await itemService.delete(id)
      if (!result.success) {
        handleApiError(result.errorMessage, 'DictManagement-删除字典项')
        return
      }
      message.success('删除成功')
      loadDictItems()
    } catch (error) {
      handleApiError(error, 'DictManagement-删除字典项')
    }
  }

  // 保存字典项
  const handleSaveItem = async () => {
    if (savingItem) return
    try {
      setSavingItem(true)
      const values = await itemForm.validateFields()
      if (editingItem) {
        const result = await itemService.update(editingItem.id, {
          ...values,
        })
        if (!result.success) {
          handleApiError(result.errorMessage, 'DictManagement-更新字典项')
          return
        }
        message.success('更新成功')
      } else {
        const result = await itemService.create({
          ...values,
        })
        if (!result.success) {
          handleApiError(result.errorMessage, 'DictManagement-创建字典项')
          return
        }
        message.success('创建成功')
      }
      setItemModalVisible(false)
      setEditingItem(null)
      itemForm.resetFields()
      resetItemPage()
      loadDictItems()
    } catch (error) {
      handleApiError(error, 'DictManagement-保存字典项')
    } finally {
      setSavingItem(false)
    }
  }

  const selectedTypeName = dictTypes.find(t => t.id === selectedTypeId)?.name

  return {
    // 字典类型
    dictTypes,
    typeLoading,
    typeSearchKeyword,
    setTypeSearchKeyword,
    selectedTypeId,
    setSelectedTypeId,
    typeModalVisible,
    setTypeModalVisible,
    editingType,
    setEditingType,
    typeForm,
    savingType,
    typeTablePagination,
    resetTypePage,
    loadDictTypes,
    handleTypeSearch,
    handleSelectType,
    handleAddType,
    handleEditType,
    handleDeleteType,
    handleSaveType,
    // 字典项
    dictItems,
    itemLoading,
    itemSearchKeyword,
    setItemSearchKeyword,
    itemModalVisible,
    setItemModalVisible,
    editingItem,
    setEditingItem,
    itemForm,
    savingItem,
    itemTablePagination,
    resetItemPage,
    loadDictItems,
    handleItemSearch,
    handleAddItem,
    handleEditItem,
    handleDeleteItem,
    handleSaveItem,
    // 派生
    selectedTypeName,
  }
}
