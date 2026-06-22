import React, { useState, useEffect, useCallback } from 'react'
import {
  Table,
  Button,
  Input,
  Space,
  Tag,
  Card,
  message,
  Modal,
  Form,
  Select,
  Popconfirm,
  Typography,
  Switch,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'
import { getActionColumn } from '../components/ActionColumn'
import { BaseService, handleApiError } from '../utils/apiClient'
import { usePagination } from '../hooks/usePagination'

const { Text } = Typography

// ==================== 类型定义 ====================

interface SensitiveWord {
  id: string
  word: string
  category: string
  level: 'low' | 'medium' | 'high'
  replace_word?: string
  description?: string
  match_mode: 'exact' | 'fuzzy' | 'regex'
  is_active: boolean
  hit_count: number
  created_by?: string
  created_at: string
  updated_at?: string
}

const MATCH_MODE_MAP: Record<string, { color: string; label: string }> = {
  exact: { color: 'blue', label: '精确' },
  fuzzy: { color: 'orange', label: '模糊' },
  regex: { color: 'purple', label: '正则' },
}

interface SensitiveWordFilters {
  keyword: string
  category: string | undefined
  level: string | undefined
}

// ==================== 组件 ====================

const SensitiveWords: React.FC = () => {
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
    try {
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
          created_at: new Date().toISOString(),
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
    }
  }

  // 表格列定义
  const columns: ColumnsType<SensitiveWord> = [
    {
      title: '敏感词',
      dataIndex: 'word',
      key: 'word',
      render: (word: string) => <Text strong style={{ color: '#ff4d4f' }}>{word}</Text>,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => <Tag>{category}</Tag>,
    },
    {
      title: '等级',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (level: string) => {
        const levelMap: Record<string, { color: string; label: string }> = {
          low: { color: 'orange', label: '低' },
          medium: { color: 'red', label: '中' },
          high: { color: 'purple', label: '高' },
        }
        const info = levelMap[level] || { color: 'default', label: level }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: '替换词',
      dataIndex: 'replace_word',
      key: 'replace_word',
      width: 120,
      render: (replaceWord: string) => replaceWord || '-',
    },
    {
      title: '匹配模式',
      dataIndex: 'match_mode',
      key: 'match_mode',
      width: 100,
      render: (mode: string) => {
        const info = MATCH_MODE_MAP[mode] || { color: 'default', label: mode }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: '命中次数',
      dataIndex: 'hit_count',
      key: 'hit_count',
      width: 100,
      render: (count: number) => <Text>{count ?? 0}</Text>,
    },
    {
      title: '创建者',
      dataIndex: 'created_by',
      key: 'created_by',
      width: 120,
      render: (createdBy: string) => createdBy || '-',
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean, record: SensitiveWord) => (
        <Switch
          checked={isActive}
          onChange={() => handleToggleActive(record)}
          checkedChildren="启用"
          unCheckedChildren="停用"
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    getActionColumn<SensitiveWord>(
      (record) => [
        {
          key: 'edit',
          label: '编辑',
          icon: <EditOutlined />,
          type: 'primary',
          onClick: () => handleEdit(record),
        },
        {
          key: 'delete',
          label: '删除',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => handleDelete(record.id),
        },
      ],
      { width: 200, maxVisible: 2 }
    ),
  ]

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
            options={[
              { label: '政治', value: 'political' },
              { label: '色情', value: 'pornographic' },
              { label: '暴力', value: 'violence' },
              { label: '广告', value: 'advertising' },
              { label: '其他', value: 'other' },
            ]}
          />
          <Select
            placeholder="等级"
            value={filters.level}
            onChange={(value) => setFilters(prev => ({ ...prev, level: value }))}
            style={{ width: 120 }}
            allowClear
            options={[
              { label: '低', value: 'low' },
              { label: '中', value: 'medium' },
              { label: '高', value: 'high' },
            ]}
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
      <Modal
        title={editingWord ? '编辑敏感词' : '新增敏感词'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => {
          setModalVisible(false)
          setEditingWord(null)
          form.resetFields()
        }}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="word"
            label="敏感词"
            rules={[{ required: true, message: '请输入敏感词' }]}
          >
            <Input placeholder="请输入敏感词" />
          </Form.Item>
          <Form.Item
            name="replace_word"
            label="替换词"
          >
            <Input placeholder="替换为（可选）" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea rows={2} placeholder="请输入描述（可选）" />
          </Form.Item>
          <Form.Item
            name="category"
            label="分类"
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <Select
              placeholder="请选择分类"
              options={[
                { label: '政治', value: 'political' },
                { label: '色情', value: 'pornographic' },
                { label: '暴力', value: 'violence' },
                { label: '广告', value: 'advertising' },
                { label: '其他', value: 'other' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="level"
            label="等级"
            rules={[{ required: true, message: '请选择等级' }]}
          >
            <Select
              placeholder="请选择等级"
              options={[
                { label: '低', value: 'low' },
                { label: '中', value: 'medium' },
                { label: '高', value: 'high' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="match_mode"
            label="匹配模式"
            rules={[{ required: true, message: '请选择匹配模式' }]}
          >
            <Select
              placeholder="请选择匹配模式"
              options={[
                { label: '精确', value: 'exact' },
                { label: '模糊', value: 'fuzzy' },
                { label: '正则', value: 'regex' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="is_active"
            label="状态"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default SensitiveWords
