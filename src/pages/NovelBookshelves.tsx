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
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  BookOutlined,
  EyeOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  ReadOutlined,
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
  const [detailVisible, setDetailVisible] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserBookshelf | null>(null)
  const [detailList, setDetailList] = useState<BookshelfDetail[]>([])

  // 加载书架列表
  const loadBookshelves = useCallback(async () => {
    setLoading(true)
    try {
      // 获取所有用户书架数据，按用户分组
      const { data: userNovels, error } = await supabase
        .from('user_novels')
        .select(`
          id,
          user_id,
          novel_id,
          progress,
          last_chapter,
          last_read_at,
          created_at,
          novels:novel_id (title, author, cover_url, category, chapter_count)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // 获取用户信息
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, username, nickname, email')

      if (userError) throw userError

      // 按用户分组统计
      const userMap = new Map<string, UserBookshelf>()
      
      userNovels?.forEach((item: any) => {
        const userId = item.user_id
        const user = users?.find((u: any) => u.id === userId)
        
        if (!userMap.has(userId)) {
          userMap.set(userId, {
            user_id: userId,
            user_name: user?.nickname || user?.username || '未知用户',
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

      setBookshelves(Array.from(userMap.values()))
    } catch (error: any) {
      message.error('加载书架列表失败：' + error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // 加载详情
  const loadDetail = useCallback(async (userId: string) => {
    setDetailLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_novels')
        .select(`
          id,
          novel_id,
          progress,
          last_chapter,
          last_read_at,
          created_at,
          novels:novel_id (title, author, cover_url, category, chapter_count)
        `)
        .eq('user_id', userId)
        .order('last_read_at', { ascending: false })

      if (error) throw error

      const details: BookshelfDetail[] = data?.map((item: any) => ({
        id: item.id,
        novel_id: item.novel_id,
        title: item.novels?.title || '未知书名',
        author: item.novels?.author || '未知作者',
        cover_url: item.novels?.cover_url,
        progress: item.progress || 0,
        last_chapter: item.last_chapter || 0,
        last_read_at: item.last_read_at,
        created_at: item.created_at,
        category: item.novels?.category,
        chapter_count: item.novels?.chapter_count || 0,
      })) || []

      setDetailList(details)
    } catch (error: any) {
      message.error('加载详情失败：' + error.message)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  // 查看详情
  const handleViewDetail = (record: UserBookshelf) => {
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
      width: 200,
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <Text code copyable={{ text }}>{text.slice(0, 12)}...</Text>
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
      width: 200,
      ellipsis: true,
    },
    {
      title: '书架小说数',
      dataIndex: 'total_books',
      key: 'total_books',
      width: 120,
      align: 'center',
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

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ marginBottom: 24 }}>
          <Title level={4}>
            <BookOutlined style={{ marginRight: 8 }} />
            用户书架列表
          </Title>
          <Text type="secondary">
            展示所有用户的书架统计信息，点击"查看详情"可查看具体书架内容
          </Text>
        </div>

        <Table
          columns={columns}
          dataSource={bookshelves}
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

      {/* 详情弹窗 */}
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
        width={800}
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
                            format={(percent) => `${percent}%`}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                          <Tooltip title="最新阅读章节">
                            <Space>
                              <ClockCircleOutlined />
                              <Text type="secondary">
                                第 {item.last_chapter} / {item.chapter_count} 章
                              </Text>
                            </Space>
                          </Tooltip>

                          <Tooltip title="最新阅读时间">
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
