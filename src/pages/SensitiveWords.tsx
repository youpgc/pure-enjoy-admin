import React, { useState, useEffect, useCallback } from 'react'
import {
  Table,
  Button,
  Input,
  Space,
  Card,
  message,
  Form,
  Select,
  Popconfirm,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'
import { BaseService, handleApiError } from '../utils/apiClient'
import { usePagination } from '../hooks/usePagination'
import { useMounted } from '../hooks/useMounted'
import {
  SENSITIVE_CATEGORY_OPTIONS,
  SENSITIVE_LEVEL_OPTIONS,
} from '../constants'
import type { SensitiveWord, SensitiveWordFilters } from './sensitive-words/types'
import { buildSensitiveWordsColumns } from './sensitive-words/columns'
import { SensitiveWordsFormModal } from './sensitive-words/SensitiveWordsFormModal'

// ==================== 组件 ====================

const SensitiveWords: React.FC = () => {
  const mountedRef = useMounted()
  const [words, setWords] = useState<SensitiveWord[]>([])
  const [loading, setLoading] = useState(false)
  const { pagination, resetPage, setTotal, tablePagination } = usePagination()
  const [filters, setFilters] = useState<SensitiveWordFilters>({
    keyword: '',
    category: undefined,
    level: undefined,
  })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [editingWord, setEditingWord] = useState<SensitiveWord | null>(null)
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const { isAdmin: _isAdmin } = usePermission()

  const wordService = React.useMemo(() => new BaseService<SensitiveWord>('sensitive_words', { defaultOrder: { column: 'created_at', ascending: false } }), [])

  // 加载敏感词列表
  const loadWords = useCallback(async () => {
    setLoading(true)
    try {
      const result = await wordService.paginate(pagination.current, pagination.pageSize, (q) => {
        let query = q
        if (filters.keyword) {
          query = query.ilike('word', `%${filters.keyword}%`)
        }
        if (filters.category) {
          query = query.eq('category', filters.category)
        }
        if (filters.level) {
          query = query.eq('level', filters.level)
        }
        return query
      })

      if (!result.success) {
        handleApiError(result.errorMessage, 'SensitiveWords-加载敏感词')
        return
      }

      if (!mountedRef.current) return
      setWords(result.data?.data || [])
      setTotal(result.data?.total || 0)
    } catch (error) {
      handleApiError(error, 'SensitiveWords-加载敏感词')
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, filters])

  useEffect(() => {
    loadWords()
  }, [loadWords])

  // 搜索
  const handleSearch = () => {
    resetPage()
    loadWords()
  }

  // 重置筛选
  const handleReset = () => {
    setFilters({
      keyword: '',
      category: undefined,
      level: undefined,
    })
    resetPage()
  }

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingWord(null)
    form.resetFields()
    form.setFieldsValue({ level: 'medium', match_mode: 'exact', is_active: true })
    setModalVisible(true)
  }

  // 打开编辑弹窗
  const handleEdit = (record: SensitiveWord) => {
    setEditingWord(record)
    form.setFieldsValue({
      ...record,
    })
    setModalVisible(true)
  }

  // 删除敏感词
  const handleDelete = async (id: string) => {
    try {
      const result = await wordService.delete(id)
      if (!result.success) {
        handleApiError(result.errorMessage, 'SensitiveWords-删除')
        return
      }
      message.success('删除成功')
      loadWords()
    } catch (error) {
      handleApiError(error, 'SensitiveWords-删除')
    }
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的敏感词')
      return
    }
    try {
      const { error } = await supabase
        .from('sensitive_words')
        .delete()
        .in('id', selectedRowKeys as string[])
      if (error) {
        handleApiError(error, 'SensitiveWords-批量删除')
        return
      }
      message.success(`成功删除 ${selectedRowKeys.length} 个敏感词`)
      setSelectedRowKeys([])
      loadWords()
    } catch (error) {
      handleApiError(error, 'SensitiveWords-批量删除')
    }
  }

  // 切换激活状态
  const handleToggleActive = async (record: SensitiveWord) => {
    try {
      const result = await wordService.update(record.id, {
        is_active: !record.is_active,
      })
      if (!result.success) {
        handleApiError(result.errorMessage, 'SensitiveWords-切换状态')
        return
      }
      message.success(`敏感词已${!record.is_active ? '激活' : '停用'}`)
      loadWords()
    } catch (error) {
      handleApiError(error, 'SensitiveWords-切换状态')
    }
  }

  // 保存敏感词
  const handleSave = async () => {
    if (saving) return
    try {
      setSaving(true)
      const values = await form.validateFields()
      if (editingWord) {
        const result = await wordService.update(editingWord.id, values)
        if (!result.success) {
          handleApiError(result.errorMessage, 'SensitiveWords-更新')
          return
        }
        message.success('更新成功')
      } else {
        const result = await wordService.create({
          ...values,
        })
        if (!result.success) {
          handleApiError(result.errorMessage, 'SensitiveWords-创建')
          return
        }
        message.success('创建成功')
      }
      setModalVisible(false)
      setEditingWord(null)
      form.resetFields()
      loadWords()
    } catch (error) {
      handleApiError(error, 'SensitiveWords-保存')
    } finally {
      setSaving(false)
    }
  }

  // 表格列定义
  const columns = buildSensitiveWordsColumns({
    onEdit: handleEdit,
    onDelete: handleDelete,
    onToggleActive: handleToggleActive,
  })

  return (
    <div style={{ padding: 24 }}>
      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索敏感词"
            value={filters.keyword}
            onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            allowClear
          />
          <Select
            placeholder="分类"
            value={filters.category}
            onChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
            style={{ width: 120 }}
            allowClear
            options={SENSITIVE_CATEGORY_OPTIONS}
          />
          <Select
            placeholder="等级"
            value={filters.level}
            onChange={(value) => setFilters(prev => ({ ...prev, level: value }))}
            style={{ width: 120 }}
            allowClear
            options={SENSITIVE_LEVEL_OPTIONS}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            搜索
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
        </Space>
      </Card>

      {/* 操作栏 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增敏感词
          </Button>
          {selectedRowKeys.length > 0 && (
            <Popconfirm
              title="确认批量删除"
              description={`确定要删除选中的 ${selectedRowKeys.length} 个敏感词吗？`}
              onConfirm={handleBatchDelete}
              okText="确认"
              cancelText="取消"
            >
              <Button danger icon={<DeleteOutlined />}>
                批量删除 ({selectedRowKeys.length})
              </Button>
            </Popconfirm>
          )}
        </Space>
        <Button icon={<ReloadOutlined />} onClick={loadWords} loading={loading}>
          刷新
        </Button>
      </div>

      {/* 敏感词表格 */}
      <Table
        columns={columns}
        dataSource={words}
        rowKey="id"
        loading={loading}
        pagination={tablePagination}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        scroll={{ x: 'max-content' }}
      />

      {/* 敏感词表单弹窗 */}
      <SensitiveWordsFormModal
        open={modalVisible}
        editingWord={editingWord}
        saving={saving}
        form={form}
        onOk={handleSave}
        onCancel={() => {
          setModalVisible(false)
          setEditingWord(null)
          form.resetFields()
        }}
      />
    </div>
  )
}

export default SensitiveWords
