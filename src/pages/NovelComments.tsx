import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Table, Card, Button, Input, Space, Tag, Popconfirm, message, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import { BaseService, handleApiError } from '../utils/apiClient'
import { usePagination } from '../hooks/usePagination'
import { usePermission } from '../hooks/usePermission'
import { useMounted } from '../hooks/useMounted'
import dayjs from 'dayjs'

interface NovelComment {
  id: string
  novel_id: string
  user_id: string
  user_nickname: string | null
  user_avatar: string | null
  content: string
  rating: number | null
  parent_id: string | null
  reply_to_user_id: string | null
  reply_to_nickname: string | null
  like_count: number
  created_at: string
  updated_at: string | null
}

interface Filters {
  keyword: string
  novelId: string
}

const NovelComments: React.FC = () => {
  const mountedRef = useMounted()
  const service = useMemo(
    () => new BaseService<NovelComment>('novel_comments', {
      defaultOrder: { column: 'created_at', ascending: false },
    }),
    []
  )

  const { pagination, resetPage, setTotal, tablePagination } = usePagination(20)
  const [comments, setComments] = useState<NovelComment[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [filters, setFilters] = useState<Filters>({ keyword: '', novelId: '' })
  const { hasPermission } = usePermission()

  const loadComments = useCallback(async () => {
    setLoading(true)
    try {
      const result = await service.paginate(pagination.current, pagination.pageSize, (q) => {
        let query = q
        if (filters.keyword) {
          query = query.ilike('content', `%${filters.keyword}%`)
        }
        if (filters.novelId) {
          query = query.eq('novel_id', filters.novelId)
        }
        // Only root comments (no parent)
        query = query.is('parent_id', null)
        return query
      })

      if (!result.success) {
        handleApiError(result.errorMessage, '加载评论失败')
        return
      }

      if (!mountedRef.current) return
      setComments(result.data?.data || [])
      setTotal(result.data?.total || 0)
    } catch (error) {
      handleApiError(error, '加载评论失败')
    } finally {
      setLoading(false)
    }
  }, [service, pagination.current, pagination.pageSize, filters, setTotal])

  useEffect(() => {
    loadComments()
  }, [loadComments])

  const handleDelete = async (id: string) => {
    try {
      const result = await service.delete(id)
      if (!result.success) {
        handleApiError(result.errorMessage, '删除失败')
        return
      }
      message.success('删除成功')
      loadComments()
    } catch (error) {
      handleApiError(error, '删除失败')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return
    try {
      const result = await service.batchDelete(selectedRowKeys as string[])
      if (!result.success) {
        handleApiError(result.errorMessage, '批量删除失败')
        return
      }
      message.success(`已删除 ${selectedRowKeys.length} 条评论`)
      setSelectedRowKeys([])
      loadComments()
    } catch (error) {
      handleApiError(error, '批量删除失败')
    }
  }

  const columns: ColumnsType<NovelComment> = [
    {
      title: '用户',
      dataIndex: 'user_nickname',
      key: 'user_nickname',
      width: 120,
      render: (text: string | null) => text || '匿名用户',
    },
    {
      title: '评论内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text.length > 50 ? text.substring(0, 50) + '...' : text}</span>
        </Tooltip>
      ),
    },
    {
      title: '评分',
      dataIndex: 'rating',
      key: 'rating',
      width: 100,
      render: (rating: number | null) =>
        rating ? (
          <span style={{ color: '#faad14' }}>
            {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
          </span>
        ) : (
          <Tag>无评分</Tag>
        ),
    },
    {
      title: '点赞',
      dataIndex: 'like_count',
      key: 'like_count',
      width: 80,
    },
    {
      title: '回复',
      dataIndex: 'reply_to_nickname',
      key: 'reply_to_nickname',
      width: 120,
      render: (text: string | null) =>
        text ? <Tag color="blue">回复 @{text}</Tag> : '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right',
      render: (_, record) =>
        hasPermission('novels:delete') ? (
          <Popconfirm
            title="确定删除这条评论吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />} size="small">
              删除
            </Button>
          </Popconfirm>
        ) : null,
    },
  ]

  return (
    <div>
      {/* 搜索筛选 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索评论内容"
            prefix={<SearchOutlined />}
            value={filters.keyword}
            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
            onPressEnter={() => { resetPage(); loadComments() }}
            style={{ width: 250 }}
            allowClear
          />
          <Input
            placeholder="小说 ID"
            value={filters.novelId}
            onChange={(e) => setFilters({ ...filters, novelId: e.target.value })}
            onPressEnter={() => { resetPage(); loadComments() }}
            style={{ width: 300 }}
            allowClear
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={() => { resetPage(); loadComments() }}>
            搜索
          </Button>
          <Button icon={<ReloadOutlined />} onClick={loadComments}>
            刷新
          </Button>
        </Space>
      </Card>

      {/* 操作栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Popconfirm
            title={`确定删除选中的 ${selectedRowKeys.length} 条评论吗？`}
            onConfirm={handleBatchDelete}
            okText="确定"
            cancelText="取消"
            disabled={selectedRowKeys.length === 0}
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              disabled={selectedRowKeys.length === 0}
            >
              批量删除 ({selectedRowKeys.length})
            </Button>
          </Popconfirm>
          <span style={{ color: '#999' }}>共 {pagination.total} 条评论</span>
        </Space>
      </Card>

      {/* 评论列表 */}
      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={comments}
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          pagination={tablePagination}
          scroll={{ x: 1000 }}
        />
      </Card>
    </div>
  )
}

export default NovelComments
