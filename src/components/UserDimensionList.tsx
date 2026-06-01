import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Tag,
  Typography,
  Tooltip,
  message,
  Empty,
  Descriptions,
  Divider,
} from 'antd'
import type { TablePaginationConfig, ColumnsType } from 'antd/es/table'
import { EyeOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { supabase } from '../utils/supabase'
import { getActionColumn } from './ActionColumn'

const { Title, Text } = Typography

// ==================== 类型定义 ====================

export interface UserSummary {
  user_id: string
  user_nickname?: string
  total_count: number
  latest_date?: string
  latest_data?: Record<string, unknown>
  categories?: string[]
  stats?: Record<string, number | string>
}

export interface RecordItem {
  id: string
  user_id: string
  created_at: string
  updated_at?: string
  [key: string]: unknown
}

export interface ModuleConfig {
  key: string
  title: string
  tableName: string
  detailColumns: ColumnsType<RecordItem>
  detailTitle?: string
}

// ==================== 常量定义 ====================

const DEFAULT_PAGE_SIZE = 10
const PAGE_SIZE_OPTIONS = ['10', '20', '30', '50', '100']

// ==================== 主组件 ====================

const UserDimensionList: React.FC<{
  moduleConfig: ModuleConfig
  pageSizeOptions?: string[]
  defaultPageSize?: number
}> = ({
  moduleConfig,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  defaultPageSize = DEFAULT_PAGE_SIZE,
}) => {
  const {
    title,
    tableName,
    detailColumns,
    detailTitle,
  } = moduleConfig

  // 状态
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<UserSummary[]>([])
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: defaultPageSize,
    showSizeChanger: true,
    showQuickJumper: true,
    pageSizeOptions,
    showTotal: (total, range) => `显示 ${range[0]}-${range[1]} 条，共 ${total} 个用户`,
  })

  // 详情弹窗状态
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailData, setDetailData] = useState<RecordItem[]>([])
  const [detailTotal, setDetailTotal] = useState(0)
  const [detailPage, setDetailPage] = useState(1)
  const [detailPageSize, setDetailPageSize] = useState(defaultPageSize)
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null)

  // 用 ref 防止重复请求
  const detailFetchingRef = useRef(false)

  // ==================== 数据加载（全量拉取，避免旧数据丢失） ====================

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // 分批拉取全部数据，避免 Supabase 默认 1000 条限制
      const allItems: Record<string, unknown>[] = []
      let offset = 0
      const batchSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data: batch, error } = await supabase
          .from(tableName)
          .select('*')
          .order('user_id')
          .range(offset, offset + batchSize - 1)

        if (error) throw error
        if (!batch || batch.length === 0) {
          hasMore = false
        } else {
          allItems.push(...batch)
          if (batch.length < batchSize) {
            hasMore = false
          }
          offset += batchSize
        }
      }

      // 按用户聚合
      const userMap = new Map<string, UserSummary>()

      for (const item of allItems) {
        const uid = item.user_id as string
        if (!uid) continue

        if (!userMap.has(uid)) {
          // 直接使用表中存储的user_nickname，无需关联查询
          const displayName = (item.user_nickname as string) || `用户${uid.substring(0, 6)}`

          userMap.set(uid, {
            user_id: uid,
            user_nickname: displayName,
            total_count: 0,
            latest_date: (item.created_at as string) || (item.updated_at as string),
            categories: [],
            stats: {},
          })
        }

        const summary = userMap.get(uid)!
        summary.total_count++

        // 更新最新日期
        const itemDate = (item.created_at as string) || (item.updated_at as string)
        if (itemDate && (!summary.latest_date || itemDate > summary.latest_date)) {
          summary.latest_date = itemDate
          summary.latest_data = item
        }

        // 收集分类
        const cat = item.category as string
        if (cat && !summary.categories?.includes(cat)) {
          summary.categories = [...(summary.categories || []), cat]
        }
      }

      // 转换为数组并排序
      const result = Array.from(userMap.values())
      result.sort((a, b) => b.total_count - a.total_count)

      setData(result)
    } catch (error) {
      console.error(`获取${title}数据失败:`, error)
      message.error(`获取${title}数据失败`)
    } finally {
      setLoading(false)
    }
  }, [tableName, title])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ==================== 详情弹窗数据加载（手动触发，避免循环） ====================

  const fetchDetailData = useCallback(async (userId: string, page: number, pageSize: number) => {
    if (!userId || detailFetchingRef.current) return

    detailFetchingRef.current = true
    setDetailLoading(true)
    try {
      const from = (page - 1) * pageSize
      const to = page * pageSize - 1

      const { data: records, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      setDetailData((records || []) as RecordItem[])
      setDetailTotal(count || 0)
    } catch (error) {
      console.error('获取详情数据失败:', error)
      message.error('获取详情数据失败')
    } finally {
      setDetailLoading(false)
      detailFetchingRef.current = false
    }
  }, [tableName])

  // 打开弹窗时加载第一页
  useEffect(() => {
    if (detailModalOpen && selectedUser) {
      setDetailPage(1)
      setDetailPageSize(defaultPageSize)
      fetchDetailData(selectedUser.user_id, 1, defaultPageSize)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailModalOpen, selectedUser])

  // ==================== 操作处理 ====================

  const handleViewDetail = useCallback((record: UserSummary) => {
    setSelectedUser(record)
    setDetailModalOpen(true)
  }, [])

  const handleDetailModalClose = useCallback(() => {
    setDetailModalOpen(false)
    setSelectedUser(null)
    setDetailData([])
    setDetailTotal(0)
  }, [])

  // 详情分页变化时手动触发请求
  const handleDetailPageChange = useCallback((page: number, pageSize: number) => {
    setDetailPage(page)
    setDetailPageSize(pageSize)
    if (selectedUser) {
      fetchDetailData(selectedUser.user_id, page, pageSize)
    }
  }, [selectedUser, fetchDetailData])

  // ==================== 表格列配置 ====================

  const columns: ColumnsType<UserSummary> = [
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
      title: '用户昵称',
      dataIndex: 'user_nickname',
      key: 'user_nickname',
      width: 120,
      render: (nickname: string) => nickname || '-',
    },
    {
      title: '记录数',
      dataIndex: 'total_count',
      key: 'total_count',
      width: 100,
      sorter: (a, b) => a.total_count - b.total_count,
      render: (count: number) => (
        <Tag color="blue">{count} 条</Tag>
      ),
    },
    {
      title: '最新记录时间',
      dataIndex: 'latest_date',
      key: 'latest_date',
      width: 180,
      sorter: (a, b) => {
        if (!a.latest_date) return 1
        if (!b.latest_date) return -1
        return new Date(b.latest_date).getTime() - new Date(a.latest_date).getTime()
      },
      render: (date: string) => (
        date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'
      ),
    },
    getActionColumn<UserSummary>(
      (record) => [
        {
          key: 'view',
          label: '查看详情',
          icon: <EyeOutlined />,
          type: 'primary',
          onClick: () => handleViewDetail(record),
        },
      ],
      { width: 240, maxVisible: 2 }
    ),
  ]

  // ==================== 渲染 ====================

  return (
    <div>
      {/* 页面标题 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>
          {title}
        </Title>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchData}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
      </div>

      {/* 统计卡片 */}
      <Card style={{ marginBottom: 16 }}>
        <Space size="large">
          <Text type="secondary">用户总数：</Text>
          <Text strong>{data.length}</Text>
          <Divider type="vertical" />
          <Text type="secondary">记录总数：</Text>
          <Text strong>{data.reduce((sum, item) => sum + item.total_count, 0)}</Text>
        </Space>
      </Card>

      {/* 数据表格 */}
      <Card>
        {data.length === 0 && !loading ? (
          <Empty description={`暂无${title}数据`} />
        ) : (
          <Table<UserSummary>
            columns={columns}
            dataSource={data}
            rowKey="user_id"
            loading={loading}
            pagination={{
              ...pagination,
              total: data.length,
            }}
            onChange={(pag) => setPagination(pag)}
            scroll={{ x: 900 }}
            size="middle"
            bordered
          />
        )}
      </Card>

      {/* 详情弹窗 */}
      <Modal
        title={
          <Space>
            <span>{detailTitle || title} - 用户详情</span>
            {selectedUser && (
              <Tag color="blue">{selectedUser.total_count} 条记录</Tag>
            )}
          </Space>
        }
        open={detailModalOpen}
        onCancel={handleDetailModalClose}
        footer={null}
        width={900}
        destroyOnClose
      >
        {selectedUser && (
          <>
            {/* 用户信息 */}
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="用户ID">
                <Text copyable={{ text: selectedUser.user_id }}>
                  {selectedUser.user_id}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="用户昵称">
                {selectedUser.user_nickname || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="记录总数">
                <Tag color="blue">{selectedUser.total_count}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="最近记录">
                {selectedUser.latest_date ? dayjs(selectedUser.latest_date).format('YYYY-MM-DD HH:mm') : '-'}
              </Descriptions.Item>
            </Descriptions>

            <Divider style={{ margin: '12px 0' }} />

            {/* 详情列表 */}
            <Table<RecordItem>
              columns={detailColumns}
              dataSource={detailData}
              rowKey="id"
              loading={detailLoading}
              pagination={{
                current: detailPage,
                pageSize: detailPageSize,
                total: detailTotal,
                showSizeChanger: true,
                showQuickJumper: true,
                pageSizeOptions,
                showTotal: (total, range) => `显示 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
                onChange: handleDetailPageChange,
              }}
              scroll={{ x: 800, y: 400 }}
              size="small"
              bordered
            />
          </>
        )}
      </Modal>
    </div>
  )
}

export default UserDimensionList
