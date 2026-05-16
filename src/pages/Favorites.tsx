import React, { useState, useMemo } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, Tag, Space, Popconfirm,
  message, Card, Tooltip, Badge, Row, Col
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  ExportOutlined, PushpinOutlined, PushpinFilled, LinkOutlined,
  StarOutlined
} from '@ant-design/icons'
import { mockFavorites, mockUsers, favoriteCategoryMap } from '../utils/mockData'
import type { MockFavorite } from '../utils/mockData'
import dayjs from 'dayjs'

const { Option } = Select

const Favorites: React.FC = () => {
  const [favorites, setFavorites] = useState<MockFavorite[]>(mockFavorites)
  const [loading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingFavorite, setEditingFavorite] = useState<MockFavorite | null>(null)
  const [searchText, setSearchText] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [form] = Form.useForm()

  // 过滤数据
  const filteredFavorites = useMemo(() => {
    return favorites.filter(item => {
      const matchSearch = !searchText || 
        item.title.toLowerCase().includes(searchText.toLowerCase()) ||
        item.url?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.tags?.some(tag => tag.toLowerCase().includes(searchText.toLowerCase()))
      const matchCategory = !categoryFilter || item.category === categoryFilter
      return matchSearch && matchCategory
    }).sort((a, b) => {
      // 置顶优先
      if (a.is_pinned && !b.is_pinned) return -1
      if (!a.is_pinned && b.is_pinned) return 1
      return dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf()
    })
  }, [favorites, searchText, categoryFilter])

  const handleAdd = () => {
    setEditingFavorite(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleEdit = (record: MockFavorite) => {
    setEditingFavorite(record)
    form.setFieldsValue({
      ...record,
      tags: record.tags?.join(', '),
    })
    setModalOpen(true)
  }

  const handleDelete = (id: string) => {
    setFavorites(prev => prev.filter(item => item.id !== id))
    message.success('删除成功')
  }

  const handleSubmit = async (values: any) => {
    const tags = values.tags ? values.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []
    
    if (editingFavorite) {
      setFavorites(prev => prev.map(item => 
        item.id === editingFavorite.id 
          ? { ...item, ...values, tags, updated_at: dayjs().format('YYYY-MM-DD HH:mm:ss') }
          : item
      ))
      message.success('更新成功')
    } else {
      const newFavorite: MockFavorite = {
        id: `fav_${Date.now()}`,
        ...values,
        tags,
        is_pinned: false,
        created_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        updated_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      }
      setFavorites(prev => [newFavorite, ...prev])
      message.success('添加成功')
    }
    setModalOpen(false)
  }

  const handleTogglePin = (record: MockFavorite) => {
    setFavorites(prev => prev.map(item => 
      item.id === record.id 
        ? { ...item, is_pinned: !item.is_pinned, updated_at: dayjs().format('YYYY-MM-DD HH:mm:ss') }
        : item
    ))
    message.success(record.is_pinned ? '已取消置顶' : '已置顶')
  }

  const handleExport = () => {
    if (filteredFavorites.length === 0) {
      message.warning('没有数据可导出')
      return
    }
    
    interface ExportRow {
      标题: string
      URL: string
      分类: string
      标签: string
      置顶: string
      创建时间: string
    }
    
    const data: ExportRow[] = filteredFavorites.map(item => ({
      标题: item.title,
      URL: item.url || '',
      分类: favoriteCategoryMap[item.category]?.label || item.category,
      标签: item.tags?.join(', ') || '',
      置顶: item.is_pinned ? '是' : '否',
      创建时间: item.created_at,
    }))
    
    const headers: (keyof ExportRow)[] = ['标题', 'URL', '分类', '标签', '置顶', '创建时间']
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
    ].join('\n')
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `收藏夹_${dayjs().format('YYYY-MM-DD')}.csv`
    link.click()
    message.success('导出成功')
  }

  const getUserName = (userId: string) => {
    return mockUsers.find(u => u.id === userId)?.nickname || '未知用户'
  }

  const columns = [
    {
      title: '',
      key: 'pin',
      width: 50,
      render: (_: any, record: MockFavorite) => (
        <Tooltip title={record.is_pinned ? '取消置顶' : '置顶'}>
          <Button
            type="text"
            icon={record.is_pinned ? <PushpinFilled style={{ color: '#1890ff' }} /> : <PushpinOutlined />}
            onClick={() => handleTogglePin(record)}
          />
        </Tooltip>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: MockFavorite) => (
        <Space>
          {record.is_pinned && <Badge status="processing" />}
          <span style={{ fontWeight: record.is_pinned ? 500 : 'normal' }}>{title}</span>
        </Space>
      ),
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      ellipsis: true,
      render: (url: string) => url ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <LinkOutlined /> {url}
        </a>
      ) : '-',
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => {
        const info = favoriteCategoryMap[category]
        return info ? <Tag color={info.color}>{info.label}</Tag> : <Tag>{category}</Tag>
      },
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => (
        <Space size={[0, 4]} wrap>
          {tags?.map(tag => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '用户',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 120,
      render: (userId: string) => getUserName(userId),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: MockFavorite) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确认删除"
            description="确定要删除这条收藏吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="删除">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const categories = Object.entries(favoriteCategoryMap).map(([key, value]) => ({
    label: value.label,
    value: key,
  }))

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space size="middle">
              <Input
                placeholder="搜索标题、URL、标签"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                style={{ width: 250 }}
                allowClear
              />
              <Select
                placeholder="筛选分类"
                value={categoryFilter || undefined}
                onChange={setCategoryFilter}
                style={{ width: 150 }}
                allowClear
              >
                {categories.map(cat => (
                  <Option key={cat.value} value={cat.value}>{cat.label}</Option>
                ))}
              </Select>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button icon={<ExportOutlined />} onClick={handleExport}>
                导出
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                添加收藏
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Table
        columns={columns}
        dataSource={filteredFavorites}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1200 }}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={8}>
              <Space>
                <StarOutlined />
                <span>共 {filteredFavorites.length} 条收藏</span>
                <span style={{ color: '#999' }}>|</span>
                <PushpinFilled style={{ color: '#1890ff' }} />
                <span>置顶 {filteredFavorites.filter(f => f.is_pinned).length} 条</span>
              </Space>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />

      <Modal
        title={editingFavorite ? '编辑收藏' : '添加收藏'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入收藏标题" />
          </Form.Item>

          <Form.Item
            name="url"
            label="URL"
          >
            <Input placeholder="https://example.com" />
          </Form.Item>

          <Form.Item
            name="category"
            label="分类"
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <Select placeholder="选择分类">
              {categories.map(cat => (
                <Option key={cat.value} value={cat.value}>{cat.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="tags"
            label="标签"
            extra="多个标签用逗号分隔"
          >
            <Input placeholder="例如: 工具, 教程, 参考" />
          </Form.Item>

          <Form.Item
            name="user_id"
            label="用户"
            rules={[{ required: true, message: '请选择用户' }]}
            initialValue={mockUsers[0]?.id}
          >
            <Select placeholder="选择用户">
              {mockUsers.slice(0, 10).map(user => (
                <Option key={user.id} value={user.id}>{user.nickname}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Favorites
