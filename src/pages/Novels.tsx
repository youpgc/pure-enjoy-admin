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
  Switch,
  Badge,
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
  EyeOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'
import { getActionColumn } from '../components/ActionColumn'
import NovelChapterModal from '../components/NovelChapterModal'
import { BaseService, apiQuery, handleApiError } from '../utils/apiClient'

const { Text } = Typography

// ==================== 枚举映射 ====================

const NOVEL_CATEGORY_MAP: Record<string, string> = {
  xuanhuan: '玄幻',
  xianxia: '仙侠',
  dushi: '都市',
  urban: '都市',
  lishi: '历史',
  fantasy: '玄幻',
  wuxia: '武侠',
  romance: '言情',
  kehuan: '科幻',
  scifi: '科幻',
  youxi: '游戏',
  history: '历史',
  mystery: '悬疑',
  xuanyi: '悬疑',
  game: '游戏',
  other: '其他',
  lingyi: '灵异',
  yanqing: '言情',
  qita: '其他',
}

const NOVEL_CATEGORY_OPTIONS = Object.entries(NOVEL_CATEGORY_MAP)
  .filter(([code, label], index, arr) => arr.findIndex(([, l]) => l === label) === index)
  .map(([code, label]) => ({ label, value: code }))

const NOVEL_STATUS_MAP: Record<string, string> = {
  ongoing: '连载中',
  completed: '已完结',
  paused: '暂停更新',
}

const NOVEL_STATUS_OPTIONS = Object.entries(NOVEL_STATUS_MAP).map(([code, label]) => ({ label, value: code }))

// ==================== 类型定义 ====================

interface Novel {
  id: string
  user_id?: string
  title: string
  author: string
  category: string
  description: string
  cover_url: string
  status: 'ongoing' | 'completed' | 'paused'
  read_count: number
  chapter_count: number
  is_free: boolean
  source?: string
  source_url?: string
  tags?: string[]
  word_count?: number
  price?: number
  rating?: number
  collect_count?: number
  created_at: string
  updated_at: string
}

interface NovelFilters {
  keyword: string
  category: string | undefined
  status: string | undefined
  isFree: boolean | undefined
}

// ==================== 组件 ====================

const Novels: React.FC = () => {
  const [novels, setNovels] = useState<Novel[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [filters, setFilters] = useState<NovelFilters>({
    keyword: '',
    category: undefined,
    status: undefined,
    isFree: undefined,
  })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [editingNovel, setEditingNovel] = useState<Novel | null>(null)
  const [chapterModalOpen, setChapterModalOpen] = useState(false)
  const [selectedNovelId, setSelectedNovelId] = useState<string>('')
  const [form] = Form.useForm()
  const { isAdmin } = usePermission()

  const novelService = new BaseService<Novel>('novels', { defaultOrder: { column: 'created_at', ascending: false } })

  // 加载小说列表
  const loadNovels = useCallback(async () => {
    setLoading(true)
    try {
      const result = await novelService.paginate(pagination.current, pagination.pageSize, (q) => {
        let query = q
        if (filters.keyword) {
          query = query.or(`title.ilike.%${filters.keyword}%,author.ilike.%${filters.keyword}%`)
        }
        if (filters.category) {
          query = query.eq('category', filters.category)
        }
        if (filters.status) {
          query = query.eq('status', filters.status)
        }
        if (filters.isFree !== undefined) {
          query = query.eq('is_free', filters.isFree)
        }
        return query
      })

      if (!result.success) {
        handleApiError(result.errorMessage, 'Novels-加载小说列表')
        return
      }

      setNovels(result.data?.data || [])
      setPagination(prev => ({ ...prev, total: result.data?.total || 0 }))
    } catch (error) {
      handleApiError(error, 'Novels-加载小说列表')
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, filters])

  useEffect(() => {
    loadNovels()
  }, [loadNovels])

  // 搜索
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }))
    loadNovels()
  }

  // 重置筛选
  const handleReset = () => {
    setFilters({
      keyword: '',
      category: undefined,
      status: undefined,
      isFree: undefined,
    })
    setPagination(prev => ({ ...prev, current: 1 }))
  }

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingNovel(null)
    form.resetFields()
    setModalVisible(true)
  }

  // 打开编辑弹窗
  const handleEdit = (record: Novel) => {
    setEditingNovel(record)
    form.setFieldsValue({
      ...record,
      // 确保表单字段正确映射
    })
    setModalVisible(true)
  }

  // 删除小说
  const handleDelete = async (id: string) => {
    try {
      const result = await novelService.delete(id)
      if (!result.success) {
        handleApiError(result.errorMessage, 'Novels-删除小说')
        return
      }
      message.success('删除成功')
      loadNovels()
    } catch (error) {
      handleApiError(error, 'Novels-删除小说')
    }
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的小说')
      return
    }
    try {
      const { error } = await supabase
        .from('novels')
        .delete()
        .in('id', selectedRowKeys as string[])
      if (error) {
        handleApiError(error, 'Novels-批量删除')
        return
      }
      message.success(`成功删除 ${selectedRowKeys.length} 本小说`)
      setSelectedRowKeys([])
      loadNovels()
    } catch (error) {
      handleApiError(error, 'Novels-批量删除')
    }
  }

  // 切换小说状态
  const handleToggleStatus = async (record: Novel) => {
    try {
      const newStatus = record.status === 'ongoing' ? 'paused' : 'ongoing'
      const result = await novelService.update(record.id, { status: newStatus })
      if (!result.success) {
        handleApiError(result.errorMessage, 'Novels-切换状态')
        return
      }
      message.success(`小说已${newStatus === 'ongoing' ? '恢复连载' : '暂停连载'}`)
      loadNovels()
    } catch (error) {
      handleApiError(error, 'Novels-切换状态')
    }
  }

  // 切换免费状态
  const handleToggleFree = async (record: Novel) => {
    try {
      const result = await novelService.update(record.id, { is_free: !record.is_free })
      if (!result.success) {
        handleApiError(result.errorMessage, 'Novels-切换免费')
        return
      }
      message.success(`已${!record.is_free ? '设为免费' : '取消免费'}`)
      loadNovels()
    } catch (error) {
      handleApiError(error, 'Novels-切换免费')
    }
  }

  // 处理弹窗提交
  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingNovel) {
        // 更新小说
        const result = await novelService.update(editingNovel.id, {
          ...values,
          updated_at: new Date().toISOString(),
        })
        if (!result.success) {
          handleApiError(result.errorMessage, 'Novels-更新小说')
          return
        }
        message.success('更新成功')
      } else {
        // 创建小说
        const result = await novelService.create({
          ...values,
          read_count: 0,
          chapter_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        if (!result.success) {
          handleApiError(result.errorMessage, 'Novels-创建小说')
          return
        }
        message.success('创建成功')
      }
      setModalVisible(false)
      setEditingNovel(null)
      form.resetFields()
      loadNovels()
    } catch (error) {
      handleApiError(error, 'Novels-保存小说')
    }
  }

  // 打开章节管理弹窗
  const handleManageChapters = (novelId: string) => {
    setSelectedNovelId(novelId)
    setChapterModalOpen(true)
  }

  // 表格列定义
  const columns: ColumnsType<Novel> = [
    {
      title: '小说信息',
      key: 'novel',
      width: 300,
      render: (_, record) => (
        <Space>
          {record.cover_url ? (
            <img
              src={record.cover_url}
              alt={record.title}
              style={{ width: 50, height: 70, objectFit: 'cover', borderRadius: 4 }}
            />
          ) : (
            <div style={{ width: 50, height: 70, background: '#f0f0f0', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOutlined style={{ fontSize: 20, color: '#999' }} />
            </div>
          )}
          <div>
            <div style={{ fontWeight: 500 }}>{record.title}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.author}</Text>
            {record.is_free && <Tag color="green" style={{ marginLeft: 4 }}>免费</Tag>}
          </div>
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category: string) => <Tag>{NOVEL_CATEGORY_MAP[category] || category}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusColorMap: Record<string, string> = {
          ongoing: 'green',
          completed: 'blue',
          paused: 'orange',
        }
        const info = statusColorMap[status] || 'default'
        return <Badge status={info as any} text={NOVEL_STATUS_MAP[status] || status} />
      },
    },
    {
      title: '阅读量',
      dataIndex: 'read_count',
      key: 'read_count',
      width: 100,
      sorter: (a, b) => a.read_count - b.read_count,
    },
    {
      title: '章节数',
      dataIndex: 'chapter_count',
      key: 'chapter_count',
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    getActionColumn<Novel>(
      (record) => [
        {
          key: 'chapters',
          label: '章节管理',
          icon: <FileTextOutlined />,
          type: 'primary',
          onClick: () => handleManageChapters(record.id),
        },
        {
          key: 'edit',
          label: '编辑',
          icon: <EditOutlined />,
          onClick: () => handleEdit(record),
        },
        {
          key: 'status',
          label: record.status === 'ongoing' ? '暂停' : '恢复',
          icon: record.status === 'ongoing' ? <StopOutlined /> : <CheckCircleOutlined />,
          onClick: () => handleToggleStatus(record),
        },
        {
          key: 'free',
          label: record.is_free ? '取消免费' : '设为免费',
          icon: <EyeOutlined />,
          onClick: () => handleToggleFree(record),
        },
        {
          key: 'delete',
          label: '删除',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => handleDelete(record.id),
        },
      ],
      { width: 240, maxVisible: 3 }
    ),
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="总小说数"
              value={pagination.total}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="连载中"
              value={novels.filter(n => n.status === 'ongoing').length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="免费小说"
              value={novels.filter(n => n.is_free).length}
              prefix={<EyeOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索书名/作者"
            value={filters.keyword}
            onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            allowClear
          />
          <Select
            placeholder="分类"
            value={filters.category}
            onChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
            style={{ width: 120 }}
            allowClear
            options={NOVEL_CATEGORY_OPTIONS}
          />
          <Select
            placeholder="状态"
            value={filters.status}
            onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            style={{ width: 120 }}
            allowClear
            options={NOVEL_STATUS_OPTIONS}
          />
          <Select
            placeholder="免费"
            value={filters.isFree}
            onChange={(value) => setFilters(prev => ({ ...prev, isFree: value }))}
            style={{ width: 120 }}
            allowClear
            options={[
              { label: '免费', value: true },
              { label: '付费', value: false },
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
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增小说
          </Button>
          {selectedRowKeys.length > 0 && (
            <Popconfirm
              title="确认批量删除"
              description={`确定要删除选中的 ${selectedRowKeys.length} 本小说吗？`}
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
        <Button icon={<ReloadOutlined />} onClick={loadNovels} loading={loading}>
          刷新
        </Button>
      </div>

      {/* 小说表格 */}
      <Table
        columns={columns}
        dataSource={novels}
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
        scroll={{ x: 1200 }}
      />

      {/* 小说表单弹窗 */}
      <Modal
        title={editingNovel ? '编辑小说' : '新增小说'}
        open={modalVisible}
        onOk={handleModalSubmit}
        onCancel={() => {
          setModalVisible(false)
          setEditingNovel(null)
          form.resetFields()
        }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="书名"
            rules={[{ required: true, message: '请输入书名' }]}
          >
            <Input placeholder="请输入书名" />
          </Form.Item>
          <Form.Item
            name="author"
            label="作者"
            rules={[{ required: true, message: '请输入作者' }]}
          >
            <Input placeholder="请输入作者" />
          </Form.Item>
          <Form.Item
            name="category"
            label="分类"
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <Select
              placeholder="请选择分类"
              options={NOVEL_CATEGORY_OPTIONS}
            />
          </Form.Item>
          <Form.Item
            name="description"
            label="简介"
          >
            <Input.TextArea rows={4} placeholder="请输入简介" />
          </Form.Item>
          <Form.Item
            name="cover_url"
            label="封面URL"
          >
            <Input placeholder="请输入封面图片URL" />
          </Form.Item>
          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select
              placeholder="请选择状态"
              options={NOVEL_STATUS_OPTIONS}
            />
          </Form.Item>
          <Form.Item
            name="is_free"
            label="免费"
            valuePropName="checked"
          >
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 章节管理弹窗 */}
      <NovelChapterModal
        open={chapterModalOpen}
        novelId={selectedNovelId}
        onClose={() => {
          setChapterModalOpen(false)
          setSelectedNovelId('')
        }}
      />
    </div>
  )
}

export default Novels
