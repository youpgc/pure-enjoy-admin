import React, { useState, useEffect, useCallback } from 'react'
import {
  Table,
  Button,
  Input,
  Space,
  Card,
  message,
  Modal,
  Form,
  Popconfirm,
  DatePicker,
  InputNumber,
  Typography,
  Descriptions,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { BaseService, handleApiError } from '../utils/apiClient'
import { usePagination } from '../hooks/usePagination'

const { Text } = Typography

// ==================== 类型定义 ====================

interface WeightRecord {
  id: string
  user_id: string
  weight: number
  date: string
  body_fat?: number
  bmi?: number
  note?: string
  user_nickname?: string
  created_at: string
  updated_at?: string
}

// ==================== 组件 ====================

const WeightRecords: React.FC = () => {
  const [records, setRecords] = useState<WeightRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const { pagination, resetPage, setTotal, tablePagination } = usePagination()
  const [modalVisible, setModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState<WeightRecord | null>(null)
  const [detailRecord, setDetailRecord] = useState<WeightRecord | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [form] = Form.useForm()

  const service = new BaseService<WeightRecord>('weight_records', { defaultOrder: { column: 'date', ascending: false } })

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await service.paginate(pagination.current, pagination.pageSize, (q) => {
        let query = q
        if (searchKeyword) {
          query = query.or(`note.ilike.%${searchKeyword}%`)
        }
        if (userFilter) {
          query = query.eq('user_id', userFilter)
        }
        return query
      })
      if (!result.success) {
        handleApiError(result.errorMessage, 'WeightRecords-加载数据')
        return
      }
      setRecords(result.data!.data)
      setTotal(result.data!.total)
    } catch (error) {
      handleApiError(error, 'WeightRecords-加载数据')
    } finally {
      setLoading(false)
    }
  }, [searchKeyword, userFilter, pagination.current, pagination.pageSize])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 搜索
  const handleSearch = () => {
    resetPage()
  }

  // 重置筛选
  const handleReset = () => {
    setSearchKeyword('')
    setUserFilter('')
    resetPage()
  }

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingRecord(null)
    form.resetFields()
    form.setFieldsValue({ date: dayjs() })
    setModalVisible(true)
  }

  // 打开编辑弹窗
  const handleEdit = (record: WeightRecord) => {
    setEditingRecord(record)
    form.setFieldsValue({
      ...record,
      date: dayjs(record.date),
    })
    setModalVisible(true)
  }

  // 查看详情
  const handleViewDetail = (record: WeightRecord) => {
    setDetailRecord(record)
    setDetailVisible(true)
  }

  // 删除记录
  const handleDelete = async (id: string) => {
    try {
      const result = await service.delete(id)
      if (!result.success) {
        handleApiError(result.errorMessage, 'WeightRecords-删除')
        return
      }
      message.success('删除成功')
      loadData()
    } catch (error) {
      handleApiError(error, 'WeightRecords-删除')
    }
  }

  // 保存记录
  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const data = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
      }
      if (editingRecord) {
        const result = await service.update(editingRecord.id, data)
        if (!result.success) {
          handleApiError(result.errorMessage, 'WeightRecords-更新')
          return
        }
        message.success('更新成功')
      } else {
        const result = await service.create(data)
        if (!result.success) {
          handleApiError(result.errorMessage, 'WeightRecords-创建')
          return
        }
        message.success('创建成功')
      }
      setModalVisible(false)
      setEditingRecord(null)
      form.resetFields()
      loadData()
    } catch (error) {
      handleApiError(error, 'WeightRecords-保存')
    }
  }

  // 表格列定义
  const columns: ColumnsType<WeightRecord> = [
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
      ellipsis: true,
    },
    {
      title: '用户昵称',
      dataIndex: 'user_nickname',
      key: 'user_nickname',
      render: (nickname: string) => nickname || '-',
    },
    {
      title: '体重(kg)',
      dataIndex: 'weight',
      key: 'weight',
      render: (weight: number) => <Text strong>{weight}</Text>,
    },
    {
      title: '记录日期',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '体脂率(%)',
      dataIndex: 'body_fat',
      key: 'body_fat',
      render: (val: number) => val != null ? val : '-',
    },
    {
      title: 'BMI',
      dataIndex: 'bmi',
      key: 'bmi',
      render: (val: number) => val != null ? val : '-',
    },
    {
      title: '备注',
      dataIndex: 'note',
      key: 'note',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            详情
          </Button>
          <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button danger size="small" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索备注"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            allowClear
          />
          <Input
            placeholder="按用户ID筛选"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            allowClear
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
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增记录
        </Button>
        <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
          刷新
        </Button>
      </div>

      {/* 数据表格 */}
      <Table
        columns={columns}
        dataSource={records}
        rowKey="id"
        loading={loading}
        pagination={tablePagination}
        scroll={{ x: 'max-content' }}
      />

      {/* 表单弹窗 */}
      <Modal
        title={editingRecord ? '编辑体重记录' : '新增体重记录'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => {
          setModalVisible(false)
          setEditingRecord(null)
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
            name="weight"
            label="体重(kg)"
            rules={[{ required: true, message: '请输入体重' }]}
          >
            <InputNumber style={{ width: '100%' }} placeholder="请输入体重" min={0} step={0.1} />
          </Form.Item>
          <Form.Item
            name="date"
            label="记录日期"
            rules={[{ required: true, message: '请选择记录日期' }]}
          >
            <DatePicker style={{ width: '100%' }} placeholder="请选择记录日期" />
          </Form.Item>
          <Form.Item
            name="note"
            label="备注"
          >
            <Input.TextArea rows={2} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="体重记录详情"
        open={detailVisible}
        onCancel={() => { setDetailVisible(false); setDetailRecord(null) }}
        footer={[
          <Button key="close" onClick={() => { setDetailVisible(false); setDetailRecord(null) }}>
            关闭
          </Button>,
        ]}
        width={500}
      >
        {detailRecord && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="用户ID">{detailRecord.user_id}</Descriptions.Item>
            <Descriptions.Item label="用户昵称">{detailRecord.user_nickname || '-'}</Descriptions.Item>
            <Descriptions.Item label="体重">{detailRecord.weight} kg</Descriptions.Item>
            <Descriptions.Item label="体脂率">{detailRecord.body_fat != null ? detailRecord.body_fat + '%' : '-'}</Descriptions.Item>
            <Descriptions.Item label="BMI">{detailRecord.bmi != null ? detailRecord.bmi : '-'}</Descriptions.Item>
            <Descriptions.Item label="记录日期">{dayjs(detailRecord.date).format('YYYY-MM-DD')}</Descriptions.Item>
            <Descriptions.Item label="备注">{detailRecord.note || '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{dayjs(detailRecord.created_at).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

export default WeightRecords
