import React, { useState, useCallback, useEffect, useMemo } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Popconfirm,
  message,
  Input,
  InputNumber,
  Typography,
  Tag,
  Switch,
  Tooltip,
  Modal,
  Row,
  Col,
  Statistic,
  Divider,
  Select,
  Badge,
  Alert,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { Key } from 'react'
import {
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  LockOutlined,
  UnlockOutlined,
  BookOutlined,
  TagOutlined,
} from '@ant-design/icons'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'

const { Title, Text } = Typography

// ==================== 类型定义 ====================

interface NovelPricingRecord {
  id: string
  key: string
  title: string
  author: string
  cover_url: string | null
  category: string | null
  chapter_count: number
  word_count: number
  status: 'ongoing' | 'completed'
  is_free: boolean
  price: number
  free_chapter_count: number
  paid_chapter_count: number
  created_at: string
  updated_at: string
}

interface ChapterInfo {
  id: string
  chapter_num: number
  title: string
  is_free: boolean
  price: number
}

// ==================== 主组件 ====================

const NovelPricing: React.FC = () => {
  const { canManageNovels, isAdmin } = usePermission()

  // 数据状态
  const [data, setData] = useState<NovelPricingRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])

  // 单本设置弹窗
  const [settingModalOpen, setSettingModalOpen] = useState(false)
  const [editingNovel, setEditingNovel] = useState<NovelPricingRecord | null>(null)
  const [settingPrice, setSettingPrice] = useState(0)
  const [settingIsFree, setSettingIsFree] = useState(true)
  const [settingFreeChapterCount, setSettingFreeChapterCount] = useState(0)
  const [settingLoading, setSettingLoading] = useState(false)
  const [novelChapters, setNovelChapters] = useState<ChapterInfo[]>([])

  // 搜索
  const [searchText, setSearchText] = useState('')

  // ==================== 加载数据 ====================

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // 获取小说列表
      const { data: novels, error: novelsError } = await supabase
        .from('novels')
        .select('*')
        .is('user_id', null)
        .order('created_at', { ascending: false })

      if (novelsError) throw novelsError

      // 获取每本小说的章节付费信息
      const records: NovelPricingRecord[] = await Promise.all(
        (novels || []).map(async (novel) => {
          // 获取该小说的章节统计
          const { data: chapters } = await supabase
            .from('novel_chapters')
            .select('id, chapter_num, title, is_free, price')
            .eq('novel_id', novel.id)

          const chapterList = chapters || []
          const freeChapters = chapterList.filter((ch) => ch.is_free)
          const paidChapters = chapterList.filter((ch) => !ch.is_free)

          return {
            id: novel.id,
            key: novel.id,
            title: novel.title,
            author: novel.author,
            cover_url: novel.cover_url,
            category: novel.category,
            chapter_count: novel.chapter_count,
            word_count: novel.word_count,
            status: novel.status as 'ongoing' | 'completed',
            is_free: novel.is_free,
            price: novel.price,
            free_chapter_count: freeChapters.length,
            paid_chapter_count: paidChapters.length,
            created_at: novel.created_at,
            updated_at: novel.updated_at,
          }
        })
      )

      setData(records)
    } catch (error) {
      console.error('获取数据失败:', error)
      message.error('获取数据失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ==================== 搜索过滤 ====================

  const filteredData = useMemo(() => {
    if (!searchText.trim()) return data
    const keyword = searchText.trim().toLowerCase()
    return data.filter(
      (item) =>
        item.title.toLowerCase().includes(keyword) ||
        item.author.toLowerCase().includes(keyword)
    )
  }, [data, searchText])

  // ==================== 统计 ====================

  const stats = useMemo(() => {
    const total = data.length
    const freeCount = data.filter((n) => n.is_free).length
    const paidCount = total - freeCount
    const totalPaidChapters = data.reduce((sum, n) => sum + n.paid_chapter_count, 0)
    return { total, freeCount, paidCount, totalPaidChapters }
  }, [data])

  // ==================== 操作处理 ====================

  // 单本设置
  const handleOpenSetting = useCallback(
    async (record: NovelPricingRecord) => {
      if (!isAdmin) return

      setEditingNovel(record)
      setSettingPrice(record.price)
      setSettingIsFree(record.is_free)
      setSettingFreeChapterCount(record.free_chapter_count)

      // 加载该小说的章节列表
      try {
        const { data: chapters, error } = await supabase
          .from('novel_chapters')
          .select('id, chapter_num, title, is_free, price')
          .eq('novel_id', record.id)
          .order('chapter_num', { ascending: true })

        if (error) throw error
        setNovelChapters(chapters || [])
      } catch (error) {
        console.error('获取章节失败:', error)
        setNovelChapters([])
      }

      setSettingModalOpen(true)
    },
    [isAdmin]
  )

  // 保存单本设置
  const handleSaveSetting = useCallback(async () => {
    if (!editingNovel || !isAdmin) return

    setSettingLoading(true)
    try {
      // 更新小说表
      const { error: novelError } = await supabase
        .from('novels')
        .update({
          is_free: settingIsFree,
          price: settingIsFree ? 0 : settingPrice,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingNovel.id)

      if (novelError) throw novelError

      // 如果设置了免费章节数，更新对应章节
      if (!settingIsFree && settingFreeChapterCount > 0) {
        // 将 chapter_num <= freeChapterCount 的设为免费，其余设为付费
        const { error: freeError } = await supabase
          .from('novel_chapters')
          .update({ is_free: true, price: 0 })
          .eq('novel_id', editingNovel.id)
          .lte('chapter_num', settingFreeChapterCount)

        if (freeError) throw freeError

        const { error: paidError } = await supabase
          .from('novel_chapters')
          .update({ is_free: false, price: settingPrice })
          .eq('novel_id', editingNovel.id)
          .gt('chapter_num', settingFreeChapterCount)

        if (paidError) throw paidError
      } else if (settingIsFree) {
        // 全部免费
        const { error: allFreeError } = await supabase
          .from('novel_chapters')
          .update({ is_free: true, price: 0 })
          .eq('novel_id', editingNovel.id)

        if (allFreeError) throw allFreeError
      } else {
        // 全部付费（没有免费章节）
        const { error: allPaidError } = await supabase
          .from('novel_chapters')
          .update({ is_free: false, price: settingPrice })
          .eq('novel_id', editingNovel.id)

        if (allPaidError) throw allPaidError
      }

      message.success('设置保存成功')
      setSettingModalOpen(false)
      fetchData() // 刷新数据
    } catch (error) {
      console.error('保存设置失败:', error)
      message.error('保存设置失败')
    } finally {
      setSettingLoading(false)
    }
  }, [editingNovel, settingIsFree, settingPrice, settingFreeChapterCount, isAdmin, fetchData])

  // 快速切换免费/付费
  const handleToggleFree = useCallback(
    async (record: NovelPricingRecord, isFree: boolean) => {
      if (!isAdmin) return

      try {
        const { error } = await supabase
          .from('novels')
          .update({
            is_free: isFree,
            price: isFree ? 0 : record.price,
            updated_at: new Date().toISOString(),
          })
          .eq('id', record.id)

        if (error) throw error

        // 同步更新章节
        if (isFree) {
          await supabase
            .from('novel_chapters')
            .update({ is_free: true, price: 0 })
            .eq('novel_id', record.id)
        }

        setData((prev) =>
          prev.map((item) =>
            item.id === record.id
              ? { ...item, is_free: isFree, price: isFree ? 0 : item.price, free_chapter_count: isFree ? item.chapter_count : item.free_chapter_count }
              : item
          )
        )
        message.success(isFree ? '已设为免费' : '已设为付费')
      } catch (error) {
        console.error('更新失败:', error)
        message.error('更新失败')
      }
    },
    [isAdmin]
  )

  // 批量设置免费
  const handleBatchSetFree = useCallback(async () => {
    if (!isAdmin || selectedRowKeys.length === 0) {
      message.warning('请先选择小说')
      return
    }

    try {
      const ids = selectedRowKeys as string[]

      // 更新小说表
      const { error } = await supabase
        .from('novels')
        .update({
          is_free: true,
          price: 0,
          updated_at: new Date().toISOString(),
        })
        .in('id', ids)

      if (error) throw error

      // 更新章节表
      await supabase
        .from('novel_chapters')
        .update({ is_free: true, price: 0 })
        .in('novel_id', ids)

      message.success(`已将 ${ids.length} 本小说设为免费`)
      setSelectedRowKeys([])
      fetchData()
    } catch (error) {
      console.error('批量设置失败:', error)
      message.error('批量设置失败')
    }
  }, [isAdmin, selectedRowKeys, fetchData])

  // 批量设置付费
  const handleBatchSetPaid = useCallback(async () => {
    if (!isAdmin || selectedRowKeys.length === 0) {
      message.warning('请先选择小说')
      return
    }

    Modal.confirm({
      title: '批量设置付费',
      content: (
        <div style={{ marginTop: 8 }}>
          <Text>请输入统一价格：</Text>
          <InputNumber
            id="batch-price-input"
            min={0.01}
            step={0.1}
            precision={2}
            defaultValue={1}
            style={{ marginLeft: 8, width: 120 }}
            prefix="¥"
          />
        </div>
      ),
      okText: '确认设置',
      cancelText: '取消',
      onOk: async () => {
        const priceInput = document.getElementById('batch-price-input') as HTMLInputElement
        const price = parseFloat(priceInput?.value || '1')

        try {
          const ids = selectedRowKeys as string[]

          const { error } = await supabase
            .from('novels')
            .update({
              is_free: false,
              price,
              updated_at: new Date().toISOString(),
            })
            .in('id', ids)

          if (error) throw error

          await supabase
            .from('novel_chapters')
            .update({ is_free: false, price })
            .in('novel_id', ids)

          message.success(`已将 ${ids.length} 本小说设为付费 (¥${price})`)
          setSelectedRowKeys([])
          fetchData()
        } catch (error) {
          console.error('批量设置失败:', error)
          message.error('批量设置失败')
        }
      },
    })
  }, [isAdmin, selectedRowKeys, fetchData])

  // 一键全部免费
  const handleAllFree = useCallback(async () => {
    if (!isAdmin) return

    Modal.confirm({
      title: '一键全部免费',
      content: '此操作将把所有小说及其章节设为免费，是否继续？',
      okText: '确认',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await supabase.from('novels').update({
            is_free: true,
            price: 0,
            updated_at: new Date().toISOString(),
          }).is('user_id', null)

          await supabase.rpc('update_all_chapters_free')

          message.success('已将所有小说设为免费')
          fetchData()
        } catch (error) {
          console.error('操作失败:', error)
          // 降级方案：逐个更新
          try {
            const novelIds = data.map((n) => n.id)
            await supabase.from('novels').update({
              is_free: true,
              price: 0,
              updated_at: new Date().toISOString(),
            }).in('id', novelIds)

            await supabase.from('novel_chapters').update({
              is_free: true,
              price: 0,
            }).in('novel_id', novelIds)

            message.success('已将所有小说设为免费')
            fetchData()
          } catch (fallbackError) {
            console.error('降级方案也失败:', fallbackError)
            message.error('操作失败，请重试')
          }
        }
      },
    })
  }, [isAdmin, data, fetchData])

  // 一键全部付费
  const handleAllPaid = useCallback(async () => {
    if (!isAdmin) return

    Modal.confirm({
      title: '一键全部付费',
      content: (
        <div style={{ marginTop: 8 }}>
          <Text>请输入统一价格：</Text>
          <InputNumber
            id="all-paid-price-input"
            min={0.01}
            step={0.1}
            precision={2}
            defaultValue={1}
            style={{ marginLeft: 8, width: 120 }}
            prefix="¥"
          />
          <br />
          <Text type="danger" style={{ marginTop: 8, display: 'block' }}>
            此操作将把所有小说及其章节设为付费！
          </Text>
        </div>
      ),
      okText: '确认',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        const priceInput = document.getElementById('all-paid-price-input') as HTMLInputElement
        const price = parseFloat(priceInput?.value || '1')

        try {
          const novelIds = data.map((n) => n.id)

          await supabase.from('novels').update({
            is_free: false,
            price,
            updated_at: new Date().toISOString(),
          }).in('id', novelIds)

          await supabase.from('novel_chapters').update({
            is_free: false,
            price,
          }).in('novel_id', novelIds)

          message.success(`已将所有小说设为付费 (¥${price})`)
          fetchData()
        } catch (error) {
          console.error('操作失败:', error)
          message.error('操作失败，请重试')
        }
      },
    })
  }, [isAdmin, data, fetchData])

  // ==================== 表格列配置 ====================

  const columns: ColumnsType<NovelPricingRecord> = [
    {
      title: '书名',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      fixed: 'left',
      render: (title: string) => (
        <Space>
          <BookOutlined style={{ color: '#1890ff' }} />
          <span style={{ fontWeight: 500 }}>{title}</span>
        </Space>
      ),
    },
    {
      title: '作者',
      dataIndex: 'author',
      key: 'author',
      width: 100,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 80,
      render: (category: string | null) =>
        category ? <Tag color="blue">{category}</Tag> : '-',
    },
    {
      title: '章节数',
      dataIndex: 'chapter_count',
      key: 'chapter_count',
      width: 80,
      align: 'center',
      sorter: (a, b) => a.chapter_count - b.chapter_count,
    },
    {
      title: '总字数',
      dataIndex: 'word_count',
      key: 'word_count',
      width: 100,
      align: 'right',
      sorter: (a, b) => a.word_count - b.word_count,
      render: (wc: number) => wc >= 10000 ? `${(wc / 10000).toFixed(1)}万` : wc.toLocaleString(),
    },
    {
      title: '付费状态',
      dataIndex: 'is_free',
      key: 'is_free',
      width: 100,
      align: 'center',
      filters: [
        { text: '免费', value: true },
        { text: '付费', value: false },
      ],
      onFilter: (value, record) => record.is_free === value,
      render: (isFree: boolean) => (
        <Badge
          status={isFree ? 'success' : 'warning'}
          text={
            <Text style={{ color: isFree ? '#52c41a' : '#faad14' }}>
              {isFree ? '免费' : '付费'}
            </Text>
          }
        />
      ),
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      width: 90,
      align: 'right',
      sorter: (a, b) => a.price - b.price,
      render: (price: number, record) =>
        record.is_free ? (
          <Text type="secondary">免费</Text>
        ) : (
          <Text strong style={{ color: '#f5222d' }}>
            ¥{price.toFixed(2)}
          </Text>
        ),
    },
    {
      title: '免费章节',
      dataIndex: 'free_chapter_count',
      key: 'free_chapter_count',
      width: 90,
      align: 'center',
      render: (count: number, record) => (
        <Tooltip title={`共 ${record.chapter_count} 章，免费 ${count} 章`}>
          <Tag color="green">{count}</Tag>
          <span style={{ color: '#999' }}>/ {record.chapter_count}</span>
        </Tooltip>
      ),
    },
    {
      title: '付费章节',
      dataIndex: 'paid_chapter_count',
      key: 'paid_chapter_count',
      width: 90,
      align: 'center',
      render: (count: number) => (
        count > 0 ? (
          <Tag color="orange">{count}</Tag>
        ) : (
          <Text type="secondary">0</Text>
        )
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      align: 'center',
      render: (status: string) => (
        <Tag color={status === 'completed' ? 'success' : 'processing'}>
          {status === 'completed' ? '已完结' : '连载中'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="详细设置">
            <Button
              type="link"
              size="small"
              icon={<SettingOutlined />}
              onClick={() => handleOpenSetting(record)}
            >
              设置
            </Button>
          </Tooltip>
          <Tooltip title={record.is_free ? '设为付费' : '设为免费'}>
            <Button
              type="link"
              size="small"
              icon={record.is_free ? <LockOutlined /> : <UnlockOutlined />}
              onClick={() => handleToggleFree(record, !record.is_free)}
              danger={record.is_free}
            >
              {record.is_free ? '付费' : '免费'}
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ]

  // ==================== 渲染 ====================

  if (!canManageNovels) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Title level={4} type="secondary">
            您没有管理付费设置的权限
          </Title>
        </div>
      </Card>
    )
  }

  return (
    <div>
      {/* 页面标题 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>
          <DollarOutlined /> 付费管理
        </Title>
        <Space>
          <Input.Search
            placeholder="搜索书名或作者"
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 220 }}
          />
        </Space>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="总小说数"
              value={stats.total}
              prefix={<BookOutlined />}
              valueStyle={{ fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="免费小说"
              value={stats.freeCount}
              prefix={<UnlockOutlined />}
              valueStyle={{ fontSize: 20, color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="付费小说"
              value={stats.paidCount}
              prefix={<LockOutlined />}
              valueStyle={{ fontSize: 20, color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="付费章节总数"
              value={stats.totalPaidChapters}
              prefix={<TagOutlined />}
              valueStyle={{ fontSize: 20, color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 操作栏 */}
      {isAdmin && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Text strong>批量操作：</Text>
              {selectedRowKeys.length > 0 && (
                <Text type="secondary">已选择 {selectedRowKeys.length} 本小说</Text>
              )}
            </Space>
            <Space>
              {selectedRowKeys.length > 0 && (
                <>
                  <Popconfirm
                    title="批量设为免费"
                    description={`确认将选中的 ${selectedRowKeys.length} 本小说设为免费？`}
                    onConfirm={handleBatchSetFree}
                    okText="确认"
                    cancelText="取消"
                  >
                    <Button icon={<UnlockOutlined />}>
                      批量免费
                    </Button>
                  </Popconfirm>
                  <Button icon={<LockOutlined />} onClick={handleBatchSetPaid}>
                    批量付费
                  </Button>
                  <Divider type="vertical" />
                  <Button onClick={() => setSelectedRowKeys([])}>
                    取消选择
                  </Button>
                </>
              )}
              <Divider type="vertical" />
              <Popconfirm
                title="一键全部免费"
                description="此操作将把所有小说设为免费，是否继续？"
                onConfirm={handleAllFree}
                okText="确认"
                cancelText="取消"
                okButtonProps={{ danger: true }}
              >
                <Button icon={<CheckCircleOutlined />} style={{ color: '#52c41a' }}>
                  一键全部免费
                </Button>
              </Popconfirm>
              <Button icon={<CloseCircleOutlined />} danger onClick={handleAllPaid}>
                一键全部付费
              </Button>
            </Space>
          </div>
        </Card>
      )}

      {/* 提示信息 */}
      {!isAdmin && (
        <Alert
          message="只读模式"
          description="您当前角色无法修改付费设置，如需修改请联系管理员。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 数据表格 */}
      <Card>
        <Table<NovelPricingRecord>
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `共 ${total} 条`,
          }}
          scroll={{ x: 1300 }}
          rowSelection={
            isAdmin
              ? {
                  selectedRowKeys,
                  onChange: (keys) => setSelectedRowKeys(keys),
                }
              : undefined
          }
          size="middle"
          bordered
        />
      </Card>

      {/* 单本设置弹窗 */}
      <Modal
        open={settingModalOpen}
        title={
          <Space>
            <SettingOutlined />
            <span>付费设置 - {editingNovel?.title}</span>
          </Space>
        }
        onCancel={() => setSettingModalOpen(false)}
        onOk={handleSaveSetting}
        confirmLoading={settingLoading}
        okText="保存设置"
        cancelText="取消"
        width={600}
        destroyOnClose
      >
        {editingNovel && (
          <div>
            {/* 基本信息 */}
            <Alert
              message={
                <Space>
                  <BookOutlined />
                  <span>{editingNovel.title}</span>
                  <span style={{ color: '#999' }}>|</span>
                  <span>{editingNovel.author}</span>
                  <span style={{ color: '#999' }}>|</span>
                  <span>{editingNovel.chapter_count} 章</span>
                </Space>
              }
              type="info"
              style={{ marginBottom: 16 }}
            />

            {/* 免费开关 */}
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                是否免费
              </Text>
              <Switch
                checked={settingIsFree}
                onChange={setSettingIsFree}
                checkedChildren="免费"
                unCheckedChildren="付费"
              />
              {settingIsFree && (
                <Text type="success" style={{ marginLeft: 12 }}>
                  <UnlockOutlined /> 所有章节免费
                </Text>
              )}
            </div>

            {/* 付费设置 */}
            {!settingIsFree && (
              <>
                <Divider orientation="left" plain>
                  <ThunderboltOutlined /> 付费配置
                </Divider>

                <div style={{ marginBottom: 16 }}>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    单章价格（元）
                  </Text>
                  <InputNumber
                    value={settingPrice}
                    onChange={(val) => setSettingPrice(val || 0)}
                    min={0.01}
                    max={999}
                    step={0.1}
                    precision={2}
                    prefix="¥"
                    style={{ width: 200 }}
                  />
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      设置每章的阅读价格
                    </Text>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    免费章节策略
                  </Text>
                  <Select
                    value={
                      settingFreeChapterCount >= editingNovel.chapter_count
                        ? 'all_free'
                        : settingFreeChapterCount === 0
                        ? 'all_paid'
                        : 'partial'
                    }
                    onChange={(val) => {
                      if (val === 'all_free') {
                        setSettingFreeChapterCount(editingNovel.chapter_count)
                      } else if (val === 'all_paid') {
                        setSettingFreeChapterCount(0)
                      } else {
                        setSettingFreeChapterCount(Math.floor(editingNovel.chapter_count / 3))
                      }
                    }}
                    style={{ width: 300, marginBottom: 8 }}
                    options={[
                      { label: '全部免费', value: 'all_free' },
                      { label: '全部付费', value: 'all_paid' },
                      { label: '前N章免费（自定义）', value: 'partial' },
                    ]}
                  />

                  {settingFreeChapterCount > 0 && settingFreeChapterCount < editingNovel.chapter_count && (
                    <div style={{ marginTop: 8 }}>
                      <Text>免费章节数：</Text>
                      <InputNumber
                        value={settingFreeChapterCount}
                        onChange={(val) => setSettingFreeChapterCount(val || 0)}
                        min={0}
                        max={editingNovel.chapter_count}
                        style={{ width: 120, marginLeft: 8 }}
                        addonAfter={`/ ${editingNovel.chapter_count} 章`}
                      />
                    </div>
                  )}

                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      策略说明：前 N 章免费，从第 N+1 章开始收费
                    </Text>
                  </div>
                </div>

                {/* 预览 */}
                <Divider orientation="left" plain>
                  设置预览
                </Divider>
                <div style={{ backgroundColor: '#f5f5f5', padding: 12, borderRadius: 6 }}>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Statistic
                        title="免费章节"
                        value={settingFreeChapterCount}
                        suffix="章"
                        valueStyle={{ fontSize: 16, color: '#52c41a' }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="付费章节"
                        value={editingNovel.chapter_count - settingFreeChapterCount}
                        suffix="章"
                        valueStyle={{ fontSize: 16, color: '#f5222d' }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="单章价格"
                        value={settingPrice}
                        prefix="¥"
                        valueStyle={{ fontSize: 16, color: '#faad14' }}
                      />
                    </Col>
                  </Row>
                </div>
              </>
            )}

            {/* 当前章节状态 */}
            {novelChapters.length > 0 && (
              <>
                <Divider orientation="left" plain>
                  章节付费状态
                </Divider>
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {novelChapters.map((ch) => (
                    <div
                      key={ch.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '4px 0',
                        borderBottom: '1px solid #f0f0f0',
                        fontSize: 13,
                      }}
                    >
                      <span>
                        第{ch.chapter_num}章 {ch.title}
                      </span>
                      <Tag color={ch.is_free ? 'green' : 'orange'}>
                        {ch.is_free ? '免费' : `¥${ch.price.toFixed(2)}`}
                      </Tag>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default NovelPricing
