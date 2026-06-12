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
  InputNumber,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  GiftOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  HistoryOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'
import { getActionColumn } from '../components/ActionColumn'
import { BaseService, apiQuery, handleApiError } from '../utils/apiClient'

const { Text } = Typography

// ==================== 类型定义 ====================

interface PointsRecord {
  id: string
  user_id: string
  user_email?: string
  type: 'earn' | 'spend' | 'adjust'
  amount: number
  reason: string
  balance_after: number
  created_at: string
}

interface PointsFilters {
  keyword: string
  type: string | undefined
}

// ==================== 组件 ====================

const PointsManagement: React.FC = () => {
  const [records, setRecords] = useState<PointsRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [filters, setFilters] = useState<PointsFilters>({
    keyword: '',
    type: undefined,
  })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [form] = Form.useForm()
  const { isAdmin } = usePermission()

  const pointsService = new BaseService<PointsRecord>('points_records', { defaultOrder: { column: 'created_at', ascending: false } })

  // 加载积分记录
  const loadRecords = useCallback(async () => {
    setLoading(true)
    try {
      const result = await pointsService.paginate(pagination.current, pagination.pageSize, (q) => {
        let query = q
        if (filters.keyword) {
          query = query.or(`user_email.ilike.%${filters.keyword}%,reason.ilike.%${filters.keyword}%`)
        }
        if (filters.type) {
          query = query.eq('type', filters.type)
        }
        return query
      })

      if (!result.success) {
        handleApiError(result.errorMessage, 'PointsManagement-加载记录')
        return
      }

      setRecords(result.data?.data || [])
      setPagination(prev => ({ ...prev, total: result.data?.total || 0 }))
    } catch (error) {
      handleApiError(error, 'PointsManagement-加载记录')
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, filters])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  // 搜索
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }))
    loadRecords()
  }

  // 重置筛选
  const handleReset = () => {
    setFilters({
      keyword: '',
      type: undefined,
    })
    setPagination(prev => ({ ...prev, current: 1 }))
  }

  // 删除记录
  const handleDelete = async (id: string) => {
    try {
      const result = await pointsService.delete(id)
      if (!result.success) {
        handleApiError(result.errorMessage, 'PointsManagement-删除')
        return
      }
      message.success('删除成功')
      loadRecords()
    } catch (error) {
      handleApiError(error, 'PointsManagement-删除')
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
        .from('points_records')
        .delete()
        .in('id', selectedRowKeys as string[])
      if (error) {
        handleApiError(error, 'PointsManagement-批量删除')
        return
      }
      message.success(`成功删除 ${selectedRowKeys.length} 条记录`)
      setSelectedRowKeys([])
      loadRecords()
    } catch (error) {
      handleApiError(error, 'PointsManagement-批量删除')
    }
  }

  // 保存积分调整
  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const result = await pointsService.create({
        ...values,
        created_at: new Date().toISOString(),
      } as any)
      if (!result.success) {
        handleApiError(result.errorMessage, 'PointsManagement-创建')
        return
      }
      message.success('积分调整成功')
      setModalVisible(false)
      form.resetFields()
      loadRecords()
    } catch (error) {
      handleApiError(error, 'PointsManagement-保存')
    }
  }

  // 表格列定义
  const columns: ColumnsType<PointsRecord> = [
    {
      title: '用户',
      key: 'user',
      width: 200,
      render: (_, record) => (
        <div>
          <div>{record.user_email || record.user_id}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>ID: {record.user_id}</Text>
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => {
        const typeMap: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
          earn: { color: 'green', label: '获得', icon: <ArrowUpOutlined /> },
          spend: { color: 'red', label: '消费', icon: <ArrowDownOutlined /> },
          adjust: { color: 'blue', label: '调整', icon: <EditOutlined /> },
        }
        const info = typeMap[type] || { color: 'default', label: type, icon: null }
        return <Tag color={info.color} icon={info.icon}>{info.label}</Tag>
      },
    },
    {
      title: '积分变动',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount: number, record: PointsRecord) => (
        <Text style={{ color: record.type === 'earn' ? '#52c41a' : '#ff4d4f', fontWeight: 500 }}>
          {record.type === 'earn' ? '+' : ''}{amount}
        </Text>
      ),
    },
    {
      title: '变动后余额',
      dataIndex: 'balance_after',
      key: 'balance_after',
      width: 120,
      render: (balance: number) => <Text strong>{balance}</Text>,
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    getActionColumn<PointsRecord>(
      (record) => [
        {
          key: 'delete',
          label: '删除',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => handleDelete(record.id),
        },
      ],
      { width: 120, maxVisible: 1 }
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
              prefix={<HistoryOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="获得积分"
              value={records.filter(r => r.type === 'earn').reduce((sum, r) => sum + r.amount, 0)}
              prefix={<ArrowUpOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="消费积分"
              value={records.filter(r => r.type === 'spend').reduce((sum, r) => sum + Math.abs(r.amount), 0)}
              prefix={<ArrowDownOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索用户/原因"
            value={filters.keyword}
            onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            allowClear
          />
          <Select
            placeholder="类型"
            value={filters.type}
            onChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
            style={{ width: 120 }}
            allowClear
            options={[
              { label: '获得', value: 'earn' },
              { label: '消费', value: 'spend' },
              { label: '调整', value: 'adjust' },
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
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
            积分调整
          </Button>
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
        <Button icon={<ReloadOutlined />} onClick={loadRecords} loading={loading}>
          刷新
        </Button>
      </div>

      {/* 积分表格 */}
      <Table
        columns={columns}
        dataSource={records}
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

      {/* 积分调整弹窗 */}
      <Modal
        title="积分调整"
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="user_id"
            label="用户ID"
            rules={[{ required: true, message: '请输入用户ID' }]}
          >
            <Input placeholder="请输入用户ID" />
          </Form.Item>
          <Form.Item
            name="type"
            label="类型"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select
              placeholder="请选择类型"
              options={[
                { label: '获得', value: 'earn' },
                { label: '消费', value: 'spend' },
                { label: '调整', value: 'adjust' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="amount"
            label="积分数量"
            rules={[{ required: true, message: '请输入积分数量' }]}
          >
            <InputNumber style={{ width: '100%' }} placeholder="请输入积分数量" />
          </Form.Item>
          <Form.Item
            name="reason"
            label="原因"
            rules={[{ required: true, message: '请输入原因' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入原因" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default PointsManagement
