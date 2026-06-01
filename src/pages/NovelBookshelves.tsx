import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Table,
  Typography,
  Space,
  Button,
  Modal,
  List,
  Tag,
  Progress,
  Tooltip,
  message,
  Spin,
  Empty,
  Badge,
  Input,
  Row,
  Col,
  Statistic,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  BookOutlined,
  EyeOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  ReadOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { supabase } from '../utils/supabase'

const { Title, Text } = Typography

// ==================== 类型定义 ====================

interface UserBookshelf {
  user_id: string
  user_name: string
  user_email: string
  total_books: number
  last_read_at: string | null
  created_at: string
}

interface BookshelfDetail {
  id: string
  novel_id: string
  title: string
  author: string
  cover_url: string | null
  progress: number
  last_chapter: number
  last_read_at: string | null
  created_at: string
  category: string | null
  chapter_count: number
}

// ==================== 组件 ====================

const NovelBookshelves: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [bookshelves, setBookshelves] = useState<UserBookshelf[]>([])
  const [filteredBookshelves, setFilteredBookshelves] = useState<UserBookshelf[]>([])
  const [searchText, setSearchText] = useState('')
  const [detailVisible, setDetailVisible] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserBookshelf | null>(null)
  const [detailList, setDetailList] = useState<BookshelfDetail[]>([])
  // 小说信息缓存，用于详情页
  const [novelsCache, setNovelsCache] = useState<Map<string, any>>(new Map())

  // 加载书架列表 - 联合 user_novels + novels + users 表查询
  const loadBookshelves = useCallback(async () => {
    setLoading(true)
    console.log('[NovelBookshelves] 开始加载书架列表')
    
    try {
      // 分别查询三个表，然后在客户端合并数据
      // 这样避免依赖外键关系定义

      // 1. 查询 user_novels
      const { data: userNovels, error: unError } = await supabase
        .from('user_novels')
        .select('id, user_id, novel_id, progress, last_chapter, last_read_at, created_at')
        .order('created_at', { ascending: false })

      if (unError) {
        console.error('[NovelBookshelves] 查询 user_novels 失败:', unError)
        throw unError
      }

      console.log(`[NovelBookshelves] 获取到 ${userNovels?.length || 0} 条用户小说记录`)

      // 2. 查询 novels 表获取书名和作者
      const novelIds = [...new Set(userNovels?.map((item: any) => item.novel_id) || [])]
      let novelsMap = new Map<string, any>()
      
      if (novelIds.length > 0) {
        const { data: novels, error: nError } = await supabase
          .from('novels')
          .select('id, title, author, cover_url, category, chapter_count')
          .in('id', novelIds)

        if (nError) {
          console.error('[NovelBookshelves] 查询 novels 失败:', nError)
          throw nError
        }

        novelsMap = new Map(novels?.map((n: any) => [n.id, n]) || [])
        setNovelsCache(novelsMap) // 缓存起来供详情页使用
        console.log(`[NovelBookshelves] 获取到 ${novels?.length || 0} 本小说信息`)
      }

      // 3. 查询 users 表获取用户信息
      const userIds = [...new Set(userNovels?.map((item: any) => item.user_id) || [])]
      let usersMap = new Map<string, any>()
      
      if (userIds.length > 0) {
        const { data: users, error: uError } = await supabase
          .from('users')
          .select('id, nickname, email')

        if (uError) {
          console.error('[NovelBookshelves] 查询 users 失败:', uError)
          throw uError
        }

        usersMap = new Map(users?.map((u: any) => [u.id, u]) || [])
        console.log(`[NovelBookshelves] 获取到 ${users?.length || 0} 个用户信息`)
      }

      // 按用户分组统计
      const userMap = new Map<string, UserBookshelf>()
      
      userNovels?.forEach((item: any) => {
        const userId = item.user_id
        const user = usersMap.get(userId)
        
        if (!userMap.has(userId)) {
          userMap.set(userId, {
            user_id: userId,
            user_name: user?.nickname || '未知用户',
            user_email: user?.email || '-',
            total_books: 0,
            last_read_at: null,
            created_at: item.created_at,
          })
        }
        
        const shelf = userMap.get(userId)!
        shelf.total_books++
        
        // 更新最后阅读时间
        if (item.last_read_at) {
          const itemTime = new Date(item.last_read_at).getTime()
          const currentTime = shelf.last_read_at ? new Date(shelf.last_read_at).getTime() : 0
          if (itemTime > currentTime) {
            shelf.last_read_at = item.last_read_at
          }
        }
      })

      const result = Array.from(userMap.values())
      console.log(`[NovelBookshelves] 成功处理 ${result.length} 个用户书架`)
      
      setBookshelves(result)
      setFilteredBookshelves(result)
    } catch (error: any) {
      console.error('[NovelBookshelves] 加载书架列表失败:', error)
      message.error('加载书架列表失败：' + error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // 搜索过滤
  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredBookshelves(bookshelves)
      return
    }
    
    const keyword = searchText.toLowerCase()
    const filtered = bookshelves.filter(
      (item) =>
        item.user_name.toLowerCase().includes(keyword) ||
        item.user_email.toLowerCase().includes(keyword) ||
        item.user_id.toLowerCase().includes(keyword)
    )
    setFilteredBookshelves(filtered)
  }, [searchText, bookshelves])

  // 加载详情 - 使用缓存的小说信息展示书名、作者、阅读进度、最后阅读时间
  const loadDetail = useCallback(async (userId: string) => {
    setDetailLoading(true)
    console.log(`[NovelBookshelves] 加载用户书架详情: ${userId}`)
    
    try {
      const { data: userNovels, error } = await supabase
        .from('user_novels')
        .select('id, novel_id, progress, last_chapter, last_read_at, created_at')
        .eq('user_id', userId)
        .order('last_read_at', { ascending: false })

      if (error) {
        console.error('[NovelBookshelves] 加载详情失败:', error)
        throw error
      }

      // 使用缓存的小说信息（loadBookshelves 已加载）
      const details: BookshelfDetail[] = userNovels?.map((item: any) => {
        const novel = novelsCache.get(item.novel_id)
        return {
          id: item.id,
          novel_id: item.novel_id,
          title: novel?.title || '未知书名',
          author: novel?.author || '未知作者',
          cover_url: novel?.cover_url,
          progress: item.progress || 0,
          last_chapter: item.last_chapter || 0,
          last_read_at: item.last_read_at,
          created_at: item.created_at,
          category: novel?.category,
          chapter_count: novel?.chapter_count || 0,
        }
      }) || []

      console.log(`[NovelBookshelves] 成功加载 ${details.length} 条详情记录`)
      setDetailList(details)
    } catch (error: any) {
      console.error('[NovelBookshelves] 加载详情失败:', error)
      message.error('加载详情失败：' + error.message)
    } finally {
      setDetailLoading(false)
    }
  }, [novelsCache])

  // 查看详情
  const handleViewDetail = (record: UserBookshelf) => {
    console.log(`[NovelBookshelves] 查看用户详情: ${record.user_name} (${record.user_id})`)
    setSelectedUser(record)
    setDetailVisible(true)
    loadDetail(record.user_id)
  }

  useEffect(() => {
    loadBookshelves()
  }, [loadBookshelves])

  // 表格列定义
  const columns: ColumnsType<UserBookshelf> = [
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 220,
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <Text code copyable={{ text }}>{text.slice(0, 16)}...</Text>
        </Tooltip>
      ),
    },
    {
      title: '用户名',
      dataIndex: 'user_name',
      key: 'user_name',
      width: 150,
      render: (text) => (
        <Space>
          <UserOutlined />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: '用户邮箱',
      dataIndex: 'user_email',
      key: 'user_email',
      width: 220,
      ellipsis: true,
    },
    {
      title: '书架小说数',
      dataIndex: 'total_books',
      key: 'total_books',
      width: 120,
      align: 'center',
      sorter: (a, b) => a.total_books - b.total_books,
      render: (count) => (
        <Badge
          count={count}
          showZero
          style={{ backgroundColor: count > 0 ? '#52c41a' : '#d9d9d9' }}
        />
      ),
    },
    {
      title: '最后阅读时间',
      dataIndex: 'last_read_at',
      key: 'last_read_at',
      width: 180,
      sorter: (a, b) => {
        if (!a.last_read_at) return 1
        if (!b.last_read_at) return -1
        return new Date(b.last_read_at).getTime() - new Date(a.last_read_at).getTime()
      },
      render: (date) => date ? (
        <Space>
          <ClockCircleOutlined />
          <Text>{dayjs(date).format('YYYY-MM-DD HH:mm')}</Text>
        </Space>
      ) : (
        <Text type="secondary">未阅读</Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
          disabled={record.total_books === 0}
        >
          查看详情
        </Button>
      ),
    },
  ]

  // 统计信息
  const stats = {
    totalUsers: bookshelves.length,
    totalBooks: bookshelves.reduce((sum, item) => sum + item.total_books, 0),
    activeReaders: bookshelves.filter(item => item.last_read_at).length,
  }

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ marginBottom: 24 }}>
          <Title level={4}>
            <BookOutlined style={{ marginRight: 8 }} />
            书架管理
          </Title>
          <Text type="secondary">
            展示所有用户的书架统计信息，联合 user_novels + novels + users 表查询
          </Text>
        </div>

        {/* 统计信息 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Card size="small" style={{ background: '#e6f7ff' }}>
              <Statistic
                title="总用户数"
                value={stats.totalUsers}
                suffix="人"
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" style={{ background: '#f6ffed' }}>
              <Statistic
                title="书架总藏书"
                value={stats.totalBooks}
                suffix="本"
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" style={{ background: '#fff7e6' }}>
              <Statistic
                title="活跃读者"
                value={stats.activeReaders}
                suffix="人"
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 搜索栏 */}
        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="搜索用户ID、用户名或邮箱"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ maxWidth: 400 }}
          />
        </div>

        <Table
          columns={columns}
          dataSource={filteredBookshelves}
          rowKey="user_id"
          loading={loading}
          scroll={{ x: 1000 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 位用户`,
          }}
        />
      </Card>

      {/* 详情弹窗 - 展示：书名、作者、阅读进度、最后阅读时间 */}
      <Modal
        title={
          <Space>
            <ReadOutlined />
            <span>{selectedUser?.user_name} 的书架详情</span>
            <Tag color="blue">共 {selectedUser?.total_books} 本</Tag>
          </Space>
        }
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={900}
      >
        <Spin spinning={detailLoading}>
          {detailList.length === 0 ? (
            <Empty description="暂无书架数据" />
          ) : (
            <List
              dataSource={detailList}
              renderItem={(item) => (
                <List.Item>
                  <Card style={{ width: '100%' }} size="small">
                    <div style={{ display: 'flex', gap: 16 }}>
                      {/* 封面 */}
                      <div style={{ flexShrink: 0 }}>
                        {item.cover_url ? (
                          <img
                            src={item.cover_url}
                            alt={item.title}
                            style={{
                              width: 80,
                              height: 110,
                              objectFit: 'cover',
                              borderRadius: 4,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 80,
                              height: 110,
                              backgroundColor: '#f0f0f0',
                              borderRadius: 4,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <BookOutlined style={{ fontSize: 24, color: '#999' }} />
                          </div>
                        )}
                      </div>

                      {/* 信息 */}
                      <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: 8 }}>
                          <Text strong style={{ fontSize: 16 }}>{item.title}</Text>
                          {item.category && (
                            <Tag color="blue" style={{ marginLeft: 8 }}>
                              {item.category}
                            </Tag>
                          )}
                        </div>

                        <div style={{ marginBottom: 8 }}>
                          <Text type="secondary">作者：{item.author}</Text>
                        </div>

                        <div style={{ marginBottom: 8 }}>
                          <Progress
                            percent={Math.round(item.progress * 100)}
                            size="small"
                            status={item.progress >= 1 ? 'success' : 'active'}
                            format={(percent) => `阅读进度 ${percent}%`}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: 24, fontSize: 12 }}>
                          <Tooltip title="最新阅读章节">
                            <Space>
                              <ClockCircleOutlined />
                              <Text type="secondary">
                                第 {item.last_chapter} / {item.chapter_count} 章
                              </Text>
                            </Space>
                          </Tooltip>

                          <Tooltip title="最后阅读时间">
                            <Space>
                              <CalendarOutlined />
                              <Text type="secondary">
                                {item.last_read_at
                                  ? dayjs(item.last_read_at).format('YYYY-MM-DD HH:mm')
                                  : '未阅读'}
                              </Text>
                            </Space>
                          </Tooltip>

                          <Tooltip title="加入书架时间">
                            <Space>
                              <BookOutlined />
                              <Text type="secondary">
                                加入：{dayjs(item.created_at).format('YYYY-MM-DD')}
                              </Text>
                            </Space>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  </Card>
                </List.Item>
              )}
            />
          )}
        </Spin>
      </Modal>
    </div>
  )
}

export default NovelBookshelves
