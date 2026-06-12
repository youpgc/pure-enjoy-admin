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
  SettingOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { BaseService, handleApiError } from '../utils/apiClient'

const { Text, Paragraph } = Typography

// ==================== 类型定义 ====================

interface AppConfig {
  id: string
  key: string
  value: string
  description?: string
  type: 'string' | 'number' | 'boolean' | 'json'
  is_active: boolean
  created_at: string
  updated_at: string
}

// ==================== 组件 ====================

const AppConfigs: React.FC = () => {
  const [configs, setConfigs] = useState<AppConfig[]>([])
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [modalVisible, setModalVisible] = useState(false)
  const [editingConfig, setEditingConfig] = useState<AppConfig | null>(null)
  const [form] = Form.useForm()

  const service = new BaseService<AppConfig>('app_configs', { defaultOrder: { column: 'key', ascending: true } })

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await service.findAll((q) => {
        if (searchKeyword) {
          return q.or(`key.ilike.%${searchKeyword}%,description.ilike.%${searchKeyword}%`)
        }
        return q
      })
      if (!result.success) {
        handleApiError(result.errorMessage, 'AppConfigs-加载数据')
        return
      }
      setConfigs(result.data || [])
    } catch (error) {
      handleApiError(error, 'AppConfigs-加载数据')
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
    setEditingConfig(null)
    form.resetFields()
    form.setFieldsValue({ type: 'string', is_active: true })
    setModalVisible(true)
  }

  // 打开编辑弹窗
  const handleEdit = (record: AppConfig) => {
    setEditingConfig(record)
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
        handleApiError(result.errorMessage, 'AppConfigs-删除')
        return
      }
      message.success('删除成功')
      loadData()
    } catch (error) {
      handleApiError(error, 'AppConfigs-删除')
    }
  }

  // 切换激活状态
  const handleToggleActive = async (record: AppConfig) => {
    try {
      const result = await service.update(record.id, {
        is_active: !record.is_active,
        updated_at: new Date().toISOString(),
      })
      if (!result.success) {
        handleApiError(result.errorMessage, 'AppConfigs-切换状态')
        return
      }
      message.success('状态更新成功')
      loadData()
    } catch (error) {
      handleApiError(error, 'AppConfigs-切换状态')
    }
  }

  // 保存记录
  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (editingConfig) {
        const result = await service.update(editingConfig.id, {
          ...values,
          updated_at: new Date().toISOString(),
        })
        if (!result.success) {
          handleApiError(result.errorMessage, 'AppConfigs-更新')
          return
        }
        message.success('更新成功')
      } else {
        const result = await service.create({
          ...values,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        if (!result.success) {
          handleApiError(result.errorMessage, 'AppConfigs-创建')
          return
        }
        message.success('创建成功')
      }
      setModalVisible(false)
      setEditingConfig(null)
      form.resetFields()
      loadData()
    } catch (error) {
      handleApiError(error, 'AppConfigs-保存')
    }
  }

  // 表格列定义
  const columns: ColumnsType<AppConfig> = [
    {
      title: '配置键',
      dataIndex: 'key',
      key: 'key',
      render: (key: string) => <Text strong>{key}</Text>,
    },
    {
      title: '配置值',
      dataIndex: 'value',
      key: 'value',
      ellipsis: true,
      render: (value: string, record: AppConfig) => {
        if (record.type === 'json') {
          return <Paragraph ellipsis style={{ marginBottom: 0 }}>{value}</Paragraph>
        }
        return value
      },
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => <Tag>{type}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean, record: AppConfig) => (
        <Switch
          checked={isActive}
          onChange={() => handleToggleActive(record)}
          checkedChildren="启用"
          unCheckedChildren="停用"
        />
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
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
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="总配置数"
              value={configs.length}
              prefix={<SettingOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="启用配置"
              value={configs.filter(c => c.is_active).length}
              prefix={<SettingOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="JSON配置"
              value={configs.filter(c => c.type === 'json').length}
              prefix={<SettingOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索配置键/描述"
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
          新增配置
        </Button>
        <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
          刷新
        </Button>
      </div>

      {/* 数据表格 */}
      <Table
        columns={columns}
        dataSource={configs}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 1000 }}
      />

      {/* 表单弹窗 */}
      <Modal
        title={editingConfig ? '编辑配置' : '新增配置'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => {
          setModalVisible(false)
          setEditingConfig(null)
          form.resetFields()
        }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="key"
            label="配置键"
            rules={[{ required: true, message: '请输入配置键' }]}
          >
            <Input placeholder="请输入配置键" disabled={!!editingConfig} />
          </Form.Item>
          <Form.Item
            name="value"
            label="配置值"
            rules={[{ required: true, message: '请输入配置值' }]}
          >
            <Input.TextArea rows={4} placeholder="请输入配置值" />
          </Form.Item>
          <Form.Item
            name="type"
            label="类型"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select
              placeholder="请选择类型"
              options={[
                { label: '字符串', value: 'string' },
                { label: '数字', value: 'number' },
                { label: '布尔值', value: 'boolean' },
                { label: 'JSON', value: 'json' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea rows={2} placeholder="请输入描述" />
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

export default AppConfigs
