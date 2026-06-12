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
  Tooltip,
  Badge,
  Typography,
  Row,
  Col,
  Statistic,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BookOutlined,
  HeartOutlined,
  ReadOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'
import { getActionColumn } from '../components/ActionColumn'
import { BaseService, apiQuery, handleApiError } from '../utils/apiClient'

const { Text } = Typography

// ==================== 类型定义 ====================

interface NovelBookshelf {
  id: string
  user_id: string
  novel_id: string
  novel_title?: string
  last_read_chapter_id?: string
  last_read_chapter_title?: string
  last_read_at?: string
  is_favorite: boolean
  created_at: string
  updated_at: string
}

interface NovelBookshelfFilters {
  keyword: string
  isFavorite: boolean | undefined
}

// ==================== 组件 ====================

const NovelBookshelves: React.FC = () => {
  const [bookshelves, setBookshelves] = useState<NovelBookshelf[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [filters, setFilters] = useState<NovelBookshelfFilters>({
    keyword: '',
    isFavorite: undefined,
  })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [editingBookshelf, setEditingBookshelf] = useState<NovelBookshelf | null>(null)
  const [form] = Form.useForm()
  const { isAdmin } = usePermission()

  const bookshelfService = new BaseService<NovelBookshelf>('user_novels', { defaultOrder: { column: 'updated_at', ascending: false } })

  // 加载书架列表
  const loadBookshelves = useCallback(async () => {
    setLoading(true)
    try {
      const result = await bookshelfService.paginate(pagination.current, pagination.pageSize, (q) => {
        let query = q
        if (filters.keyword) {
          query = query.or(`novel_title.ilike.%${filters.keyword}%,user_id.ilike.%${filters.keyword}%`)
        }
        if (filters.isFavorite !== undefined) {
          query = query.eq('is_favorite', filters.isFavorite)
        }
        return query
      })

      if (!result.success) {
        handleApiError(result.errorMessage, 'NovelBookshelves-加载书架')
        return
      }

      setBookshelves(result.data?.data || [])
      setPagination(prev => ({ ...prev, total: result.data?.total || 0 }))
    } catch (error) {
      handleApiError(error, 'NovelBookshelves-加载书架')
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, filters])

  useEffect(() => {
    loadBookshelves()
  }, [loadBookshelves])

  // 搜索
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }))
    loadBookshelves()
  }

  // 重置筛选
  const handleReset = () => {
    setFilters({
      keyword: '',
      isFavorite: undefined,
    })
    setPagination(prev => ({ ...prev, current: 1 }))
  }

  // 删除书架记录
  const handleDelete = async (id: string) => {
    try {
      const result = await bookshelfService.delete(id)
      if (!result.success) {
        handleApiError(result.errorMessage, 'NovelBookshelves-删除')
        return
      }
      message.success('删除成功')
      loadBookshelves()
    } catch (error) {
      handleApiError(error, 'NovelBookshelves-删除')
    }
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的记录')
      return
    }
    try {
      const { error } = await supabase
        .from('user_novels')
        .delete()
        .in('id', selectedRowKeys as string[])
      if (error) {
        handleApiError(error, 'NovelBookshelves-批量删除')
        return
      }
      message.success(`成功删除 ${selectedRowKeys.length} 条记录`)
      setSelectedRowKeys([])
      loadBookshelves()
    } catch (error) {
      handleApiError(error, 'NovelBookshelves-批量删除')
    }
  }

  // 切换收藏状态
  const handleToggleFavorite = async (record: NovelBookshelf) => {
    try {
      const result = await bookshelfService.update(record.id, {
        is_favorite: !record.is_favorite,
        updated_at: new Date().toISOString(),
      })
      if (!result.success) {
        handleApiError(result.errorMessage, 'NovelBookshelves-切换收藏')
        return
      }
      message.success(`已${!record.is_favorite ? '加入' : '取消'}收藏`)
      loadBookshelves()
    } catch (error) {
      handleApiError(error, 'NovelBookshelves-切换收藏')
    }
  }

  // 表格列定义
  const columns: ColumnsType<NovelBookshelf> = [
    {
      title: '小说',
      key: 'novel',
      width: 250,
      render: (_, record) => (
        <Space>
          <BookOutlined style={{ fontSize: 20, color: '#1890ff' }} />
          <div>
            <div style={{ fontWeight: 500 }}>{record.novel_title || '未知小说'}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>ID: {record.novel_id}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 200,
      ellipsis: true,
      render: (uid: string) => (
        <Tooltip title={uid}>
          <Text copyable={{ text: uid }}>{uid.substring(0, 16)}...</Text>
        </Tooltip>
      ),
    },
    {
      title: '最后阅读章节',
      key: 'last_read',
      width: 200,
      render: (_, record) => (
        <div>
          <div>{record.last_read_chapter_title || '-'}</div>
          {record.last_read_at && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {dayjs(record.last_read_at).format('YYYY-MM-DD HH:mm')}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: '收藏',
      dataIndex: 'is_favorite',
      key: 'is_favorite',
      width: 100,
      render: (isFavorite: boolean) => (
        <Tag color={isFavorite ? 'red' : 'default'}>
          {isFavorite ? '已收藏' : '未收藏'}
        </Tag>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 170,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    getActionColumn<NovelBookshelf>(
      (record) => [
        {
          key: 'favorite',
          label: record.is_favorite ? '取消收藏' : '收藏',
          icon: <HeartOutlined />,
          type: record.is_favorite ? 'default' : 'primary',
          onClick: () => handleToggleFavorite(record),
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
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="总记录数"
              value={pagination.total}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="收藏数"
              value={bookshelves.filter(b => b.is_favorite).length}
              prefix={<HeartOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="今日活跃"
              value={bookshelves.filter(b => dayjs(b.last_read_at).isSame(dayjs(), 'day')).length}
              prefix={<ReadOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索小说标题/用户ID"
            value={filters.keyword}
            onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            allowClear
          />
          <Select
            placeholder="收藏状态"
            value={filters.isFavorite}
            onChange={(value) => setFilters(prev => ({ ...prev, isFavorite: value }))}
            style={{ width: 120 }}
            allowClear
            options={[
              { label: '已收藏', value: true },
              { label: '未收藏', value: false },
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
          {selectedRowKeys.length > 0 && (
            <Popconfirm
              title="确认批量删除"
              description={`确定要删除选中的 ${selectedRowKeys.length} 条记录吗？`}
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
        <Button icon={<ReloadOutlined />} onClick={loadBookshelves} loading={loading}>
          刷新
        </Button>
      </div>

      {/* 书架表格 */}
      <Table
        columns={columns}
        dataSource={bookshelves}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => {
            setPagination(prev => ({ ...prev, current: page, pageSize: pageSize || 20 }))
          },
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        scroll={{ x: 1000 }}
      />
    </div>
  )
}

export default NovelBookshelves
