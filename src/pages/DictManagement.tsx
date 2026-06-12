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
  Popconfirm,
  InputNumber,
  Switch,
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
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { BaseService, handleApiError } from '../utils/apiClient'

const { Text } = Typography

// ==================== 类型定义 ====================

interface DictItem {
  id: string
  dict_type: string
  dict_code: string
  dict_label: string
  dict_value: string
  sort_order: number
  is_active: boolean
  created_at: string
}

// ==================== 组件 ====================

const DictManagement: React.FC = () => {
  const [dicts, setDicts] = useState<DictItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [modalVisible, setModalVisible] = useState(false)
  const [editingDict, setEditingDict] = useState<DictItem | null>(null)
  const [form] = Form.useForm()

  const service = new BaseService<DictItem>('dict_items', { defaultOrder: { column: 'sort_order', ascending: true } })

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await service.findAll((q) => {
        if (searchKeyword) {
          return q.or(`dict_type.ilike.%${searchKeyword}%,dict_label.ilike.%${searchKeyword}%,dict_code.ilike.%${searchKeyword}%`)
        }
        return q
      })
      if (!result.success) {
        handleApiError(result.errorMessage, 'DictManagement-加载数据')
        return
      }
      setDicts(result.data || [])
    } catch (error) {
      handleApiError(error, 'DictManagement-加载数据')
    } finally {
      setLoading(false)
    }
  }, [searchKeyword])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 搜索
  const handleSearch = () => {
    loadData()
  }

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingDict(null)
    form.resetFields()
    form.setFieldsValue({ sort_order: 0, is_active: true })
    setModalVisible(true)
  }

  // 打开编辑弹窗
  const handleEdit = (record: DictItem) => {
    setEditingDict(record)
    form.setFieldsValue({
      ...record,
    })
    setModalVisible(true)
  }

  // 删除记录
  const handleDelete = async (id: string) => {
    try {
      const result = await service.delete(id)
      if (!result.success) {
        handleApiError(result.errorMessage, 'DictManagement-删除')
        return
      }
      message.success('删除成功')
      loadData()
    } catch (error) {
      handleApiError(error, 'DictManagement-删除')
    }
  }

  // 保存记录
  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (editingDict) {
        const result = await service.update(editingDict.id, values)
        if (!result.success) {
          handleApiError(result.errorMessage, 'DictManagement-更新')
          return
        }
        message.success('更新成功')
      } else {
        const result = await service.create({
          ...values,
          created_at: new Date().toISOString(),
        })
        if (!result.success) {
          handleApiError(result.errorMessage, 'DictManagement-创建')
          return
        }
        message.success('创建成功')
      }
      setModalVisible(false)
      setEditingDict(null)
      form.resetFields()
      loadData()
    } catch (error) {
      handleApiError(error, 'DictManagement-保存')
    }
  }

  // 表格列定义
  const columns: ColumnsType<DictItem> = [
    {
      title: '字典类型',
      dataIndex: 'dict_type',
      key: 'dict_type',
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: '字典编码',
      dataIndex: 'dict_code',
      key: 'dict_code',
      render: (code: string) => <Text strong>{code}</Text>,
    },
    {
      title: '标签',
      dataIndex: 'dict_label',
      key: 'dict_label',
    },
    {
      title: '值',
      dataIndex: 'dict_value',
      key: 'dict_value',
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>{isActive ? '启用' : '停用'}</Tag>
      ),
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

  // 字典类型统计
  const typeCount = new Set(dicts.map(d => d.dict_type)).size

  return (
    <div style={{ padding: 24 }}>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="总字典项"
              value={dicts.length}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="字典类型数"
              value={typeCount}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="启用项"
              value={dicts.filter(d => d.is_active).length}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索字典类型/编码/标签"
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
          新增字典项
        </Button>
        <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
          刷新
        </Button>
      </div>

      {/* 数据表格 */}
      <Table
        columns={columns}
        dataSource={dicts}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 1000 }}
      />

      {/* 表单弹窗 */}
      <Modal
        title={editingDict ? '编辑字典项' : '新增字典项'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => {
          setModalVisible(false)
          setEditingDict(null)
          form.resetFields()
        }}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="dict_type"
            label="字典类型"
            rules={[{ required: true, message: '请输入字典类型' }]}
          >
            <Input placeholder="请输入字典类型" />
          </Form.Item>
          <Form.Item
            name="dict_code"
            label="字典编码"
            rules={[{ required: true, message: '请输入字典编码' }]}
          >
            <Input placeholder="请输入字典编码" />
          </Form.Item>
          <Form.Item
            name="dict_label"
            label="标签"
            rules={[{ required: true, message: '请输入标签' }]}
          >
            <Input placeholder="请输入标签" />
          </Form.Item>
          <Form.Item
            name="dict_value"
            label="值"
            rules={[{ required: true, message: '请输入值' }]}
          >
            <Input placeholder="请输入值" />
          </Form.Item>
          <Form.Item
            name="sort_order"
            label="排序"
          >
            <InputNumber style={{ width: '100%' }} placeholder="请输入排序" min={0} />
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

export default DictManagement
