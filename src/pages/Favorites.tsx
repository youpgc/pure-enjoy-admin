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
  HeartOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { BaseService, handleApiError } from '../utils/apiClient'

const { Text } = Typography

// ==================== 类型定义 ====================

interface Favorite {
  id: string
  user_id: string
  item_id: string
  item_type: string
  item_title?: string
  created_at: string
}

// ==================== 组件 ====================

const Favorites: React.FC = () => {
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [modalVisible, setModalVisible] = useState(false)
  const [editingFavorite, setEditingFavorite] = useState<Favorite | null>(null)
  const [form] = Form.useForm()

  const service = new BaseService<Favorite>('favorites', { defaultOrder: { column: 'created_at', ascending: false } })

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await service.findAll((q) => {
        if (searchKeyword) {
          return q.or(`user_id.ilike.%${searchKeyword}%,item_title.ilike.%${searchKeyword}%`)
        }
        return q
      })
      if (!result.success) {
        handleApiError(result.errorMessage, 'Favorites-加载数据')
        return
      }
      setFavorites(result.data || [])
    } catch (error) {
      handleApiError(error, 'Favorites-加载数据')
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
    setEditingFavorite(null)
    form.resetFields()
    setModalVisible(true)
  }

  // 打开编辑弹窗
  const handleEdit = (record: Favorite) => {
    setEditingFavorite(record)
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
        handleApiError(result.errorMessage, 'Favorites-删除')
        return
      }
      message.success('删除成功')
      loadData()
    } catch (error) {
      handleApiError(error, 'Favorites-删除')
    }
  }

  // 保存记录
  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (editingFavorite) {
        const result = await service.update(editingFavorite.id, values)
        if (!result.success) {
          handleApiError(result.errorMessage, 'Favorites-更新')
          return
        }
        message.success('更新成功')
      } else {
        const result = await service.create({
          ...values,
          created_at: new Date().toISOString(),
        })
        if (!result.success) {
          handleApiError(result.errorMessage, 'Favorites-创建')
          return
        }
        message.success('创建成功')
      }
      setModalVisible(false)
      setEditingFavorite(null)
      form.resetFields()
      loadData()
    } catch (error) {
      handleApiError(error, 'Favorites-保存')
    }
  }

  // 表格列定义
  const columns: ColumnsType<Favorite> = [
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
      ellipsis: true,
    },
    {
      title: '项目标题',
      dataIndex: 'item_title',
      key: 'item_title',
      render: (title: string) => <Text strong>{title || '-'}</Text>,
    },
    {
      title: '项目类型',
      dataIndex: 'item_type',
      key: 'item_type',
    },
    {
      title: '项目ID',
      dataIndex: 'item_id',
      key: 'item_id',
      ellipsis: true,
    },
    {
      title: '收藏时间',
      dataIndex: 'created_at',
      key: 'created_at',
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
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="总收藏数"
              value={favorites.length}
              prefix={<HeartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="今日收藏"
              value={favorites.filter(f => dayjs(f.created_at).isSame(dayjs(), 'day')).length}
              prefix={<HeartOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索用户ID/项目标题"
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
          新增收藏
        </Button>
        <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
          刷新
        </Button>
      </div>

      {/* 数据表格 */}
      <Table
        columns={columns}
        dataSource={favorites}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 800 }}
      />

      {/* 表单弹窗 */}
      <Modal
        title={editingFavorite ? '编辑收藏' : '新增收藏'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => {
          setModalVisible(false)
          setEditingFavorite(null)
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
            name="item_id"
            label="项目ID"
            rules={[{ required: true, message: '请输入项目ID' }]}
          >
            <Input placeholder="请输入项目ID" />
          </Form.Item>
          <Form.Item
            name="item_type"
            label="项目类型"
            rules={[{ required: true, message: '请输入项目类型' }]}
          >
            <Input placeholder="请输入项目类型" />
          </Form.Item>
          <Form.Item
            name="item_title"
            label="项目标题"
          >
            <Input placeholder="请输入项目标题" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Favorites
