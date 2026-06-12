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

// ==================== 枚举映射 ====================

const FAVORITE_CATEGORY_MAP: Record<string, string> = {
  other: '其他',
  novel: '小说',
  note: '笔记',
  expense: '消费',
  mood: '心情',
}

const FAVORITE_CATEGORY_OPTIONS = Object.entries(FAVORITE_CATEGORY_MAP).map(([code, label]) => ({ label, value: code }))

// ==================== 类型定义 ====================

interface Favorite {
  id: string
  user_id: string
  title: string
  url?: string
  description?: string
  category?: string
  tags?: string[]
  is_pinned?: boolean
  user_nickname?: string
  created_at: string
  updated_at?: string
}

// ==================== 组件 ====================

const Favorites: React.FC = () => {
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const { pagination, resetPage, setTotal, tablePagination } = usePagination()
  const [modalVisible, setModalVisible] = useState(false)
  const [editingFavorite, setEditingFavorite] = useState<Favorite | null>(null)
  const [detailFavorite, setDetailFavorite] = useState<Favorite | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [form] = Form.useForm()

  const service = new BaseService<Favorite>('user_favorites', { defaultOrder: { column: 'created_at', ascending: false } })

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await service.paginate(pagination.current, pagination.pageSize, (q) => {
        let query = q
        if (searchKeyword) {
          query = query.or(`title.ilike.%${searchKeyword}%`)
        }
        if (userFilter) {
          query = query.eq('user_id', userFilter)
        }
        return query
      })
      if (!result.success) {
        handleApiError(result.errorMessage, 'Favorites-加载数据')
        return
      }
      setFavorites(result.data!.data)
      setTotal(result.data!.total)
    } catch (error) {
      handleApiError(error, 'Favorites-加载数据')
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

  // 查看详情
  const handleViewDetail = (record: Favorite) => {
    setDetailFavorite(record)
    setDetailVisible(true)
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
      title: '用户昵称',
      dataIndex: 'user_nickname',
      key: 'user_nickname',
      render: (nickname: string) => nickname || '-',
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string) => <Text strong>{title || '-'}</Text>,
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      ellipsis: true,
      render: (url: string) => url ? <a href={url} target="_blank" rel="noopener noreferrer">{url}</a> : '-',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => FAVORITE_CATEGORY_MAP[category] || category || '-',
    },
    {
      title: '置顶',
      dataIndex: 'is_pinned',
      key: 'is_pinned',
      render: (pinned: boolean) => pinned ? '是' : '否',
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
            placeholder="搜索标题"
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
        pagination={tablePagination}
        scroll={{ x: 'max-content' }}
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
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入标题" />
          </Form.Item>
          <Form.Item
            name="url"
            label="URL"
          >
            <Input placeholder="请输入URL" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea rows={2} placeholder="请输入描述" />
          </Form.Item>
          <Form.Item
            name="category"
            label="分类"
          >
            <Select
              placeholder="请选择分类"
              allowClear
              options={FAVORITE_CATEGORY_OPTIONS}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="收藏详情"
        open={detailVisible}
        onCancel={() => { setDetailVisible(false); setDetailFavorite(null) }}
        footer={[
          <Button key="close" onClick={() => { setDetailVisible(false); setDetailFavorite(null) }}>
            关闭
          </Button>,
        ]}
        width={500}
      >
        {detailFavorite && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="用户ID">{detailFavorite.user_id}</Descriptions.Item>
            <Descriptions.Item label="用户昵称">{detailFavorite.user_nickname || '-'}</Descriptions.Item>
            <Descriptions.Item label="标题">{detailFavorite.title}</Descriptions.Item>
            <Descriptions.Item label="URL">{detailFavorite.url ? <a href={detailFavorite.url} target="_blank" rel="noopener noreferrer">{detailFavorite.url}</a> : '-'}</Descriptions.Item>
            <Descriptions.Item label="描述">{detailFavorite.description || '-'}</Descriptions.Item>
            <Descriptions.Item label="分类">{FAVORITE_CATEGORY_MAP[detailFavorite.category || ''] || detailFavorite.category || '-'}</Descriptions.Item>
            <Descriptions.Item label="置顶">{detailFavorite.is_pinned ? '是' : '否'}</Descriptions.Item>
            <Descriptions.Item label="收藏时间">{dayjs(detailFavorite.created_at).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

export default Favorites
