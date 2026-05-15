import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Popconfirm,
  message,
  Input,
  Typography,
  Empty,
  Spin,
  Tag,
  Tooltip,
  Modal,
  Breadcrumb,
  Divider,
  Badge,
  Row,
  Col,
  Statistic,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ImportOutlined,
  EyeOutlined,
  SaveOutlined,
  BookOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  ContainerOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'

const { Title, Text } = Typography
const { TextArea, Search } = Input

// ==================== 类型定义 ====================

interface NovelItem {
  id: string
  title: string
  author: string
  chapter_count: number
  word_count: number
  status: 'ongoing' | 'completed'
}

interface ChapterRecord {
  id: string
  key: string
  novel_id: string
  chapter_num: number
  title: string
  content: string
  word_count: number
  is_free: boolean
  price: number
  created_at: string
  updated_at: string
}

// ==================== 主组件 ====================

const NovelContentEditor: React.FC = () => {
  const { canManageNovels, isAdmin } = usePermission()

  // 小说列表状态
  const [novels, setNovels] = useState<NovelItem[]>([])
  const [novelsLoading, setNovelsLoading] = useState(false)
  const [selectedNovel, setSelectedNovel] = useState<NovelItem | null>(null)
  const [novelSearch, setNovelSearch] = useState('')
  const [leftCollapsed, setLeftCollapsed] = useState(false)

  // 章节列表状态
  const [chapters, setChapters] = useState<ChapterRecord[]>([])
  const [chaptersLoading, setChaptersLoading] = useState(false)
  const [selectedChapter, setSelectedChapter] = useState<ChapterRecord | null>(null)

  // 编辑器状态
  const [editContent, setEditContent] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 预览状态
  const [previewOpen, setPreviewOpen] = useState(false)

  // 批量导入状态
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importLoading, setImportLoading] = useState(false)

  // ==================== 加载小说列表 ====================

  const fetchNovels = useCallback(async () => {
    setNovelsLoading(true)
    try {
      const { data, error } = await supabase
        .from('novels')
        .select('id, title, author, chapter_count, word_count, status')
        .is('user_id', null)
        .order('title', { ascending: true })

      if (error) throw error
      setNovels(data || [])
    } catch (error) {
      console.error('获取小说列表失败:', error)
      message.error('获取小说列表失败')
    } finally {
      setNovelsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNovels()
  }, [fetchNovels])

  // ==================== 加载章节列表 ====================

  const fetchChapters = useCallback(async (novelId: string) => {
    setChaptersLoading(true)
    try {
      const { data, error } = await supabase
        .from('novel_chapters')
        .select('*')
        .eq('novel_id', novelId)
        .order('chapter_num', { ascending: true })

      if (error) throw error

      const records: ChapterRecord[] = (data || []).map((ch) => ({
        ...ch,
        key: ch.id,
      }))
      setChapters(records)
    } catch (error) {
      console.error('获取章节列表失败:', error)
      message.error('获取章节列表失败')
    } finally {
      setChaptersLoading(false)
    }
  }, [])

  // 选择小说
  const handleSelectNovel = useCallback((novel: NovelItem) => {
    setSelectedNovel(novel)
    setSelectedChapter(null)
    setEditContent('')
    setEditTitle('')
    setHasUnsavedChanges(false)
    setLastSaved(null)
    fetchChapters(novel.id)
  }, [fetchChapters])

  // ==================== 选择章节 ====================

  const handleSelectChapter = useCallback((chapter: ChapterRecord) => {
    // 如果有未保存的更改，提示
    if (hasUnsavedChanges && selectedChapter) {
      Modal.confirm({
        title: '未保存的更改',
        content: '当前章节有未保存的更改，切换章节将丢失这些更改。是否继续？',
        okText: '继续切换',
        cancelText: '留在此页',
        onOk: () => {
          setSelectedChapter(chapter)
          setEditContent(chapter.content || '')
          setEditTitle(chapter.title)
          setHasUnsavedChanges(false)
          setLastSaved(null)
        },
      })
    } else {
      setSelectedChapter(chapter)
      setEditContent(chapter.content || '')
      setEditTitle(chapter.title)
      setHasUnsavedChanges(false)
      setLastSaved(null)
    }
  }, [hasUnsavedChanges, selectedChapter])

  // ==================== 自动保存 ====================

  const handleContentChange = useCallback((value: string) => {
    setEditContent(value)
    setHasUnsavedChanges(true)

    // 清除之前的定时器
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    // 3秒后自动保存
    autoSaveTimerRef.current = setTimeout(() => {
      handleSave()
    }, 3000)
  }, [])

  const handleTitleChange = useCallback((value: string) => {
    setEditTitle(value)
    setHasUnsavedChanges(true)

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    autoSaveTimerRef.current = setTimeout(() => {
      handleSave()
    }, 3000)
  }, [])

  // 手动保存
  const handleSave = useCallback(async () => {
    if (!selectedChapter || !isAdmin) return

    // 清除自动保存定时器
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }

    setSaving(true)
    try {
      const wordCount = editContent.length
      const { error } = await supabase
        .from('novel_chapters')
        .update({
          title: editTitle,
          content: editContent,
          word_count: wordCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedChapter.id)

      if (error) throw error

      // 更新本地状态
      setChapters((prev) =>
        prev.map((ch) =>
          ch.id === selectedChapter.id
            ? { ...ch, title: editTitle, content: editContent, word_count: wordCount }
            : ch
        )
      )
      setSelectedChapter((prev) =>
        prev ? { ...prev, title: editTitle, content: editContent, word_count: wordCount } : null
      )
      setHasUnsavedChanges(false)
      setLastSaved(new Date())
      message.success('保存成功')
    } catch (error) {
      console.error('保存失败:', error)
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }, [selectedChapter, editTitle, editContent, isAdmin])

  // 组件卸载时清除定时器
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [])

  // ==================== 新增章节 ====================

  const handleAddChapter = useCallback(() => {
    if (!selectedNovel || !isAdmin) return

    const nextNum = chapters.length > 0
      ? Math.max(...chapters.map((c) => c.chapter_num)) + 1
      : 1

    const newChapter: ChapterRecord = {
      id: `temp_${Date.now()}`,
      key: `temp_${Date.now()}`,
      novel_id: selectedNovel.id,
      chapter_num: nextNum,
      title: `第${nextNum}章 新章节`,
      content: '',
      word_count: 0,
      is_free: true,
      price: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setChapters((prev) => [...prev, newChapter])
    setSelectedChapter(newChapter)
    setEditContent('')
    setEditTitle(newChapter.title)
    setHasUnsavedChanges(false)
    setLastSaved(null)
    message.info('已创建新章节，请编辑内容后保存')
  }, [selectedNovel, chapters, isAdmin])

  // ==================== 删除章节 ====================

  const handleDeleteChapter = useCallback(async (chapterId: string) => {
    if (!isAdmin) return

    try {
      const { error } = await supabase
        .from('novel_chapters')
        .delete()
        .eq('id', chapterId)

      if (error) throw error

      setChapters((prev) => prev.filter((ch) => ch.id !== chapterId))
      if (selectedChapter?.id === chapterId) {
        setSelectedChapter(null)
        setEditContent('')
        setEditTitle('')
        setHasUnsavedChanges(false)
      }
      message.success('删除成功')
    } catch (error) {
      console.error('删除失败:', error)
      message.error('删除失败')
    }
  }, [isAdmin, selectedChapter])

  // ==================== 章节排序 ====================

  const handleMoveUp = useCallback(async (chapter: ChapterRecord) => {
    if (!isAdmin) return

    const idx = chapters.findIndex((ch) => ch.id === chapter.id)
    if (idx <= 0) return

    const prevChapter = chapters[idx - 1]!
    const nextIdx = idx

    // 交换 chapter_num
    try {
      const { error: error1 } = await supabase
        .from('novel_chapters')
        .update({ chapter_num: prevChapter.chapter_num })
        .eq('id', chapter.id)

      if (error1) throw error1

      const { error: error2 } = await supabase
        .from('novel_chapters')
        .update({ chapter_num: chapter.chapter_num })
        .eq('id', prevChapter.id)

      if (error2) throw error2

      // 更新本地状态
      const newChapters = [...chapters]
      const temp = newChapters[nextIdx]!
      newChapters[nextIdx] = newChapters[nextIdx - 1]!
      newChapters[nextIdx - 1] = temp
      setChapters(newChapters)
      message.success('排序成功')
    } catch (error) {
      console.error('排序失败:', error)
      message.error('排序失败')
    }
  }, [chapters, isAdmin])

  const handleMoveDown = useCallback(async (chapter: ChapterRecord) => {
    if (!isAdmin) return

    const idx = chapters.findIndex((ch) => ch.id === chapter.id)
    if (idx < 0 || idx >= chapters.length - 1) return

    const nextChapter = chapters[idx + 1]!

    try {
      const { error: error1 } = await supabase
        .from('novel_chapters')
        .update({ chapter_num: nextChapter.chapter_num })
        .eq('id', chapter.id)

      if (error1) throw error1

      const { error: error2 } = await supabase
        .from('novel_chapters')
        .update({ chapter_num: chapter.chapter_num })
        .eq('id', nextChapter.id)

      if (error2) throw error2

      // 更新本地状态
      const newChapters = [...chapters]
      const temp = newChapters[idx]!
      newChapters[idx] = newChapters[idx + 1]!
      newChapters[idx + 1] = temp
      setChapters(newChapters)
      message.success('排序成功')
    } catch (error) {
      console.error('排序失败:', error)
      message.error('排序失败')
    }
  }, [chapters, isAdmin])

  // ==================== 批量导入 ====================

  const handleBatchImport = useCallback(() => {
    if (!selectedNovel || !isAdmin) return
    setImportText('')
    setImportModalOpen(true)
  }, [selectedNovel, isAdmin])

  const handleImportSubmit = useCallback(async () => {
    if (!selectedNovel || !importText.trim()) return

    setImportLoading(true)
    try {
      // 解析文本：按 "第X章 标题" 格式分隔
      const chapterRegex = /第[零一二三四五六七八九十百千万\d]+章\s*.+/g
      const matches = importText.match(chapterRegex)

      if (!matches || matches.length === 0) {
        message.warning('未识别到章节格式，请确保使用"第X章 标题"格式分隔章节')
        setImportLoading(false)
        return
      }

      // 获取当前最大章节号
      const maxChapterNum = chapters.length > 0
        ? Math.max(...chapters.map((c) => c.chapter_num))
        : 0

      const chapterDataList = matches.map((match, index) => {
        // 提取标题（去掉 "第X章" 前缀中的多余空格）
        const title = match.trim()
        // 获取该章节的内容（从当前匹配位置到下一个匹配位置）
        const startIdx = importText.indexOf(match) + match.length
        const nextMatch = matches[index + 1]
        const endIdx = nextMatch ? importText.indexOf(nextMatch) : importText.length
        const content = importText.substring(startIdx, endIdx).trim()

        return {
          novel_id: selectedNovel.id,
          chapter_num: maxChapterNum + index + 1,
          title,
          content,
          word_count: content.length,
          is_free: true,
          price: 0,
        }
      })

      // 批量插入
      const { error } = await supabase
        .from('novel_chapters')
        .insert(chapterDataList)

      if (error) throw error

      message.success(`成功导入 ${chapterDataList.length} 个章节`)
      setImportModalOpen(false)
      setImportText('')
      fetchChapters(selectedNovel.id)
    } catch (error) {
      console.error('批量导入失败:', error)
      message.error('批量导入失败')
    } finally {
      setImportLoading(false)
    }
  }, [selectedNovel, importText, chapters, fetchChapters])

  // ==================== 过滤小说列表 ====================

  const filteredNovels = useMemo(() => {
    if (!novelSearch.trim()) return novels
    const keyword = novelSearch.trim().toLowerCase()
    return novels.filter(
      (n) =>
        n.title.toLowerCase().includes(keyword) ||
        n.author.toLowerCase().includes(keyword)
    )
  }, [novels, novelSearch])

  // ==================== 统计数据 ====================

  const totalWordCount = useMemo(() => {
    return chapters.reduce((sum, ch) => sum + ch.word_count, 0)
  }, [chapters])

  const freeChapterCount = useMemo(() => {
    return chapters.filter((ch) => ch.is_free).length
  }, [chapters])

  // ==================== 章节表格列 ====================

  const chapterColumns: ColumnsType<ChapterRecord> = [
    {
      title: '序号',
      dataIndex: 'chapter_num',
      key: 'chapter_num',
      width: 70,
      align: 'center',
    },
    {
      title: '章节标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string, record) => (
        <a
          onClick={() => handleSelectChapter(record)}
          style={{
            fontWeight: selectedChapter?.id === record.id ? 600 : 400,
            color: selectedChapter?.id === record.id ? '#1890ff' : undefined,
          }}
        >
          {title}
        </a>
      ),
    },
    {
      title: '字数',
      dataIndex: 'word_count',
      key: 'word_count',
      width: 90,
      align: 'right',
      render: (wc: number) => wc > 0 ? `${wc.toLocaleString()}` : '-',
    },
    {
      title: '状态',
      key: 'status',
      width: 70,
      align: 'center',
      render: (_, record) => (
        <Tag color={record.is_free ? 'green' : 'orange'} style={{ marginRight: 0 }}>
          {record.is_free ? '免费' : '付费'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: isAdmin ? 160 : 80,
      align: 'center',
      render: (_, record) => (
        <Space size={0}>
          <Tooltip title="预览">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedChapter(record)
                setPreviewOpen(true)
              }}
            />
          </Tooltip>
          {isAdmin && (
            <>
              <Tooltip title="上移">
                <Button
                  type="link"
                  size="small"
                  icon={<ArrowUpOutlined />}
                  disabled={chapters.findIndex((ch) => ch.id === record.id) === 0}
                  onClick={() => handleMoveUp(record)}
                />
              </Tooltip>
              <Tooltip title="下移">
                <Button
                  type="link"
                  size="small"
                  icon={<ArrowDownOutlined />}
                  disabled={
                    chapters.findIndex((ch) => ch.id === record.id) ===
                    chapters.length - 1
                  }
                  onClick={() => handleMoveDown(record)}
                />
              </Tooltip>
              <Popconfirm
                title="确认删除"
                description="删除后无法恢复，是否继续？"
                onConfirm={() => handleDeleteChapter(record.id)}
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
              >
                <Button type="link" size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </>
          )}
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
            您没有管理小说内容的权限
          </Title>
        </div>
      </Card>
    )
  }

  return (
    <div style={{ height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column' }}>
      {/* 面包屑 */}
      <Breadcrumb
        style={{ marginBottom: 12 }}
        items={[
          { title: <><BookOutlined /> 小说库</> },
          selectedNovel ? { title: selectedNovel.title } : undefined,
          selectedChapter ? { title: selectedChapter.title } : undefined,
        ].filter(Boolean) as { title: React.ReactNode }[]}
      />

      {/* 主布局 */}
      <div style={{ display: 'flex', flex: 1, gap: 12, minHeight: 0 }}>
        {/* 左侧：小说列表 */}
        <Card
          size="small"
          style={{
            width: leftCollapsed ? 48 : 260,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          bodyStyle={{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            {!leftCollapsed && (
              <Search
                placeholder="搜索小说"
                size="small"
                allowClear
                value={novelSearch}
                onChange={(e) => setNovelSearch(e.target.value)}
                style={{ flex: 1 }}
              />
            )}
            <Button
              type="text"
              size="small"
              icon={leftCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setLeftCollapsed(!leftCollapsed)}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: leftCollapsed ? '0 4px' : '0 8px' }}>
            {novelsLoading ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <Spin />
              </div>
            ) : filteredNovels.length === 0 ? (
              <Empty description="暂无小说" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              filteredNovels.map((novel) => (
                <div
                  key={novel.id}
                  onClick={() => handleSelectNovel(novel)}
                  style={{
                    padding: leftCollapsed ? '8px 4px' : '8px 12px',
                    cursor: 'pointer',
                    borderRadius: 6,
                    marginBottom: 2,
                    backgroundColor: selectedNovel?.id === novel.id ? '#e6f7ff' : 'transparent',
                    borderLeft: selectedNovel?.id === novel.id ? '3px solid #1890ff' : '3px solid transparent',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedNovel?.id !== novel.id) {
                      e.currentTarget.style.backgroundColor = '#f5f5f5'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedNovel?.id !== novel.id) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  {leftCollapsed ? (
                    <Tooltip title={novel.title} placement="right">
                      <BookOutlined style={{ fontSize: 16, color: '#1890ff' }} />
                    </Tooltip>
                  ) : (
                    <>
                      <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {novel.title}
                      </div>
                      <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                        {novel.author} | {novel.chapter_count}章
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>

        {/* 右侧 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          {!selectedNovel ? (
            /* 未选择小说 */
            <Card style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Empty description="请从左侧选择一本小说" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                <Text type="secondary">选择小说后可管理章节内容</Text>
              </Empty>
            </Card>
          ) : (
            <>
              {/* 右侧上方：章节列表 */}
              <Card
                size="small"
                style={{ flex: '0 0 auto' }}
                bodyStyle={{ padding: '8px 12px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Space>
                    <Title level={5} style={{ margin: 0 }}>
                      <ContainerOutlined /> 章节列表
                    </Title>
                    <Tag color="blue">{chapters.length} 章</Tag>
                  </Space>
                  {isAdmin && (
                    <Space>
                      <Button size="small" icon={<ImportOutlined />} onClick={handleBatchImport}>
                        批量导入
                      </Button>
                      <Button size="small" type="primary" icon={<PlusOutlined />} onClick={handleAddChapter}>
                        新增章节
                      </Button>
                    </Space>
                  )}
                </div>

                {/* 统计 */}
                <Row gutter={16} style={{ marginBottom: 8 }}>
                  <Col span={8}>
                    <Statistic title="总字数" value={totalWordCount} valueStyle={{ fontSize: 14 }} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="免费章节" value={freeChapterCount} suffix={`/ ${chapters.length}`} valueStyle={{ fontSize: 14 }} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="付费章节" value={chapters.length - freeChapterCount} valueStyle={{ fontSize: 14 }} />
                  </Col>
                </Row>

                <Table<ChapterRecord>
                  columns={chapterColumns}
                  dataSource={chapters}
                  rowKey="id"
                  loading={chaptersLoading}
                  size="small"
                  pagination={{
                    pageSize: 8,
                    size: 'small',
                    showSizeChanger: false,
                    showTotal: (total) => `共 ${total} 章`,
                  }}
                  scroll={{ y: 260 }}
                  style={{ fontSize: 12 }}
                  rowClassName={(record) =>
                    selectedChapter?.id === record.id ? 'ant-table-row-selected' : ''
                  }
                />
              </Card>

              {/* 右侧下方：内容编辑器 */}
              <Card
                size="small"
                style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 12, overflow: 'hidden' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Space>
                    <Title level={5} style={{ margin: 0 }}>
                      <EditOutlined /> 内容编辑器
                    </Title>
                    {selectedChapter && (
                      <Badge
                        status={hasUnsavedChanges ? 'processing' : 'success'}
                        text={
                          hasUnsavedChanges
                            ? '有未保存的更改'
                            : lastSaved
                            ? `已保存 ${lastSaved.toLocaleTimeString()}`
                            : '已保存'
                        }
                        style={{ fontSize: 12 }}
                      />
                    )}
                  </Space>
                  <Space>
                    {selectedChapter && (
                      <>
                        <Button
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => setPreviewOpen(true)}
                        >
                          预览
                        </Button>
                        {isAdmin && (
                          <Button
                            size="small"
                            type="primary"
                            icon={<SaveOutlined />}
                            loading={saving}
                            onClick={handleSave}
                            disabled={!hasUnsavedChanges}
                          >
                            保存
                          </Button>
                        )}
                      </>
                    )}
                  </Space>
                </div>

                {!selectedChapter ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Empty description="请从上方选择一个章节进行编辑" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    {/* 章节标题编辑 */}
                    <Input
                      value={editTitle}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="章节标题"
                      style={{ marginBottom: 8, fontWeight: 500 }}
                      disabled={!isAdmin}
                      suffix={
                        <Space size={4}>
                          {hasUnsavedChanges && <SyncOutlined spin style={{ color: '#1890ff', fontSize: 12 }} />}
                          {!hasUnsavedChanges && lastSaved && <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 12 }} />}
                        </Space>
                      }
                    />

                    {/* 内容编辑区域 */}
                    <TextArea
                      value={editContent}
                      onChange={(e) => handleContentChange(e.target.value)}
                      placeholder="请输入章节内容..."
                      disabled={!isAdmin}
                      autoSize={false}
                      style={{
                        flex: 1,
                        resize: 'none',
                        fontFamily: "'Noto Sans SC', 'Microsoft YaHei', sans-serif",
                        fontSize: 14,
                        lineHeight: 1.8,
                      }}
                      showCount
                      maxLength={500000}
                    />
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>

      {/* 预览弹窗 */}
      <Modal
        open={previewOpen}
        title={
          <Space>
            <FileTextOutlined />
            <span>章节预览</span>
          </Space>
        }
        onCancel={() => setPreviewOpen(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewOpen(false)}>
            关闭
          </Button>,
        ]}
        width={720}
        style={{ top: 20 }}
      >
        {selectedChapter && (
          <div>
            <Title level={4} style={{ textAlign: 'center', marginBottom: 16 }}>
              {selectedChapter.title}
            </Title>
            <Divider style={{ margin: '0 0 16px 0' }} />
            <div
              style={{
                maxHeight: '60vh',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.8,
                fontSize: 15,
                fontFamily: "'Noto Sans SC', 'Microsoft YaHei', sans-serif",
              }}
            >
              {selectedChapter.content || '（暂无内容）'}
            </div>
            <Divider style={{ margin: '16px 0 0 0' }} />
            <div style={{ textAlign: 'right', color: '#999', fontSize: 12 }}>
              字数：{selectedChapter.word_count} | 创建时间：{new Date(selectedChapter.created_at).toLocaleString('zh-CN')}
            </div>
          </div>
        )}
      </Modal>

      {/* 批量导入弹窗 */}
      <Modal
        open={importModalOpen}
        title={
          <Space>
            <ImportOutlined />
            <span>批量导入章节</span>
          </Space>
        }
        onCancel={() => {
          setImportModalOpen(false)
          setImportText('')
        }}
        onOk={handleImportSubmit}
        confirmLoading={importLoading}
        okText="开始导入"
        cancelText="取消"
        width={700}
      >
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">
            请粘贴小说全文，系统将自动按"第X章 标题"格式拆分为独立章节。
            每个章节标题需以"第"开头，包含"章"字。
          </Text>
        </div>
        <div style={{ marginBottom: 12 }}>
          <Text strong>示例格式：</Text>
          <div
            style={{
              backgroundColor: '#f5f5f5',
              padding: 12,
              borderRadius: 6,
              marginTop: 4,
              fontFamily: 'monospace',
              fontSize: 12,
            }}
          >
            第一章 初入江湖{'\n'}
            这是第一章的内容...{'\n'}
            第二章 崭露头角{'\n'}
            这是第二章的内容...
          </div>
        </div>
        <TextArea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="请粘贴小说全文内容..."
          autoSize={{ minRows: 10, maxRows: 20 }}
          showCount
          maxLength={2000000}
        />
      </Modal>
    </div>
  )
}

export default NovelContentEditor
