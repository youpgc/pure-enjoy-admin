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
  Select,
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
  SmileOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { BaseService, handleApiError } from '../utils/apiClient'
import { usePagination } from '../hooks/usePagination'

const { Text } = Typography

// ==================== 枚举映射 ====================

const MOOD_TYPE_MAP: Record<string, string> = {
  happy: '开心',
  excited: '兴奋',
  calm: '平静',
  neutral: '一般',
  sad: '难过',
  anxious: '焦虑',
  angry: '生气',
  tired: '疲惫',
  grateful: '感恩',
}

const MOOD_OPTIONS = Object.entries(MOOD_TYPE_MAP).map(([code, label]) => ({ label, value: code }))

// ==================== 类型定义 ====================

interface MoodDiary {
  id: string
  user_id: string
  mood: string
  mood_label?: string
  content: string
  date: string
  user_nickname?: string
  synced?: boolean
  created_at: string
  updated_at?: string
}

// ==================== 组件 ====================

const MoodDiaries: React.FC = () => {
  const [records, setRecords] = useState<MoodDiary[]>([])
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const { pagination, resetPage, setTotal, tablePagination } = usePagination()
  const [modalVisible, setModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState<MoodDiary | null>(null)
  const [form] = Form.useForm()

  const service = new BaseService<MoodDiary>('mood_diaries', { defaultOrder: { column: 'date', ascending: false } })

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await service.paginate(pagination.current, pagination.pageSize, (q) => {
        if (searchKeyword) {
          return q.or(`user_id.ilike.%${searchKeyword}%,content.ilike.%${searchKeyword}%`)
        }
        return q
      })
      if (!result.success) {
        handleApiError(result.errorMessage, 'MoodDiaries-加载数据')
        return
      }
      setRecords(result.data!.data)
      setTotal(result.data!.total)
    } catch (error) {
      handleApiError(error, 'MoodDiaries-加载数据')
    } finally {
      setLoading(false)
    }
  }, [searchKeyword, pagination.current, pagination.pageSize])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 搜索
  const handleSearch = () => {
    resetPage()
  }

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingRecord(null)
    form.resetFields()
    form.setFieldsValue({ date: dayjs(), mood: 'happy' })
    setModalVisible(true)
  }

  // 打开编辑弹窗
  const handleEdit = (record: MoodDiary) => {
    setEditingRecord(record)
    form.setFieldsValue({
      ...record,
      date: dayjs(record.date),
    })
    setModalVisible(true)
  }

  // 删除记录
  const handleDelete = async (id: string) => {
    try {
      const result = await service.delete(id)
      if (!result.success) {
        handleApiError(result.errorMessage, 'MoodDiaries-删除')
        return
      }
      message.success('删除成功')
      loadData()
    } catch (error) {
      handleApiError(error, 'MoodDiaries-删除')
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
          handleApiError(result.errorMessage, 'MoodDiaries-更新')
          return
        }
        message.success('更新成功')
      } else {
        const result = await service.create(data)
        if (!result.success) {
          handleApiError(result.errorMessage, 'MoodDiaries-创建')
          return
        }
        message.success('创建成功')
      }
      setModalVisible(false)
      setEditingRecord(null)
      form.resetFields()
      loadData()
    } catch (error) {
      handleApiError(error, 'MoodDiaries-保存')
    }
  }

  // 心情颜色映射
  const getMoodColor = (mood: string) => {
    const map: Record<string, string> = {
      happy: '#52c41a',
      sad: '#1890ff',
      angry: '#ff4d4f',
      anxious: '#faad14',
      calm: '#13c2c2',
      excited: '#eb2f96',
    }
    return map[mood] || '#999'
  }

  // 表格列定义
  const columns: ColumnsType<MoodDiary> = [
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
      ellipsis: true,
    },
    {
      title: '心情',
      dataIndex: 'mood',
      key: 'mood',
      render: (mood: string) => (
        <Text style={{ color: getMoodColor(mood), fontWeight: 500 }}>
          {MOOD_TYPE_MAP[mood] || mood}
        </Text>
      ),
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
    },
    {
      title: '心情标签',
      dataIndex: 'mood_label',
      key: 'mood_label',
      render: (label: string) => label || '-',
    },
    {
      title: '记录日期',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '用户昵称',
      dataIndex: 'user_nickname',
      key: 'user_nickname',
      render: (nickname: string) => nickname || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
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
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="总记录数"
              value={records.length}
              prefix={<SmileOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="今日记录"
              value={records.filter(r => dayjs(r.date).isSame(dayjs(), 'day')).length}
              prefix={<SmileOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索用户ID/内容"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            allowClear
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            搜索
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
        scroll={{ x: 800 }}
      />

      {/* 表单弹窗 */}
      <Modal
        title={editingRecord ? '编辑心情日记' : '新增心情日记'}
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
            name="mood"
            label="心情"
            rules={[{ required: true, message: '请选择心情' }]}
          >
            <Select
              placeholder="请选择心情"
              options={MOOD_OPTIONS}
            />
          </Form.Item>
          <Form.Item
            name="content"
            label="内容"
          >
            <Input.TextArea rows={4} placeholder="请输入内容" />
          </Form.Item>
          <Form.Item
            name="date"
            label="记录日期"
            rules={[{ required: true, message: '请选择记录日期' }]}
          >
            <DatePicker style={{ width: '100%' }} placeholder="请选择记录日期" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default MoodDiaries
