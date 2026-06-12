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
  Upload,
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
  UploadOutlined,
  DeleteOutlined,
  FileOutlined,
  PictureOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
  AudioOutlined,
  InboxOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'
import { getActionColumn } from '../components/ActionColumn'
import { BaseService, apiExecute, handleApiError } from '../utils/apiClient'

const { Text } = Typography
const { Dragger } = Upload

// ==================== 类型定义 ====================

interface FileItem {
  id: string
  name: string
  bucket: string
  path: string
  size: number
  mime_type: string
  url: string
  created_at: string
}

interface FileFilters {
  keyword: string
  bucket: string | undefined
}

// ==================== 组件 ====================

const FileManagement: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [filters, setFilters] = useState<FileFilters>({
    keyword: '',
    bucket: undefined,
  })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [_uploading, setUploading] = useState(false)
  const { isAdmin: _isAdmin } = usePermission()

  const fileService = new BaseService<FileItem>('files', { defaultOrder: { column: 'created_at', ascending: false } })

  // 加载文件列表
  const loadFiles = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fileService.paginate(pagination.current, pagination.pageSize, (q) => {
        let query = q
        if (filters.keyword) {
          query = query.ilike('name', `%${filters.keyword}%`)
        }
        if (filters.bucket) {
          query = query.eq('bucket', filters.bucket)
        }
        return query
      })

      if (!result.success) {
        handleApiError(result.errorMessage, 'FileManagement-加载文件')
        return
      }

      setFiles(result.data?.data || [])
      setPagination(prev => ({ ...prev, total: result.data?.total || 0 }))
    } catch (error) {
      handleApiError(error, 'FileManagement-加载文件')
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, filters])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  // 搜索
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }))
    loadFiles()
  }

  // 重置筛选
  const handleReset = () => {
    setFilters({
      keyword: '',
      bucket: undefined,
    })
    setPagination(prev => ({ ...prev, current: 1 }))
  }

  // 删除文件
  const handleDelete = async (record: FileItem) => {
    try {
      // 先删除存储
      const storageResult = await apiExecute(
        () => supabase.storage.from(record.bucket).remove([record.path]),
        'FileManagement-删除存储'
      )
      if (!storageResult.success) {
        handleApiError(storageResult.errorMessage, 'FileManagement-删除存储')
        return
      }

      // 再删除数据库记录
      const result = await fileService.delete(record.id)
      if (!result.success) {
        handleApiError(result.errorMessage, 'FileManagement-删除记录')
        return
      }
      message.success('删除成功')
      loadFiles()
    } catch (error) {
      handleApiError(error, 'FileManagement-删除')
    }
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的文件')
      return
    }
    try {
      const selectedFiles = files.filter(f => selectedRowKeys.includes(f.id))
      // 按 bucket 分组删除存储
      const bucketGroups = selectedFiles.reduce((acc, file) => {
        const b = file.bucket
        if (!acc[b]) acc[b] = []
        acc[b].push(file.path)
        return acc
      }, {} as Record<string, string[]>)

      for (const [bucket, paths] of Object.entries(bucketGroups)) {
        await apiExecute(
          () => supabase.storage.from(bucket).remove(paths as string[]),
          'FileManagement-批量删除存储'
        )
      }

      const { error } = await supabase
        .from('files')
        .delete()
        .in('id', selectedRowKeys as string[])
      if (error) {
        handleApiError(error, 'FileManagement-批量删除记录')
        return
      }
      message.success(`成功删除 ${selectedRowKeys.length} 个文件`)
      setSelectedRowKeys([])
      loadFiles()
    } catch (error) {
      handleApiError(error, 'FileManagement-批量删除')
    }
  }

  // 上传文件
  const handleUpload = async (file: File) => {
    try {
      setUploading(true)
      const bucket = filters.bucket || 'public'
      const fileExt = file.name.split('.').pop()
      const filePath = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`

      const uploadResult = await apiExecute(
        () => supabase.storage.from(bucket).upload(filePath, file),
        'FileManagement-上传文件'
      )

      if (!uploadResult.success) {
        message.error('上传失败')
        return false
      }

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath)

      // 保存文件记录
      const saveResult = await fileService.create({
        name: file.name,
        bucket,
        path: filePath,
        size: file.size,
        mime_type: file.type,
        url: publicUrl,
        created_at: new Date().toISOString(),
      } as any)

      if (!saveResult.success) {
        handleApiError(saveResult.errorMessage, 'FileManagement-保存记录')
        return false
      }

      message.success('上传成功')
      loadFiles()
      return false
    } catch (error) {
      handleApiError(error, 'FileManagement-上传')
      return false
    } finally {
      setUploading(false)
    }
  }

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 获取文件图标
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <PictureOutlined style={{ color: '#1890ff' }} />
    if (mimeType.startsWith('video/')) return <VideoCameraOutlined style={{ color: '#ff4d4f' }} />
    if (mimeType.startsWith('audio/')) return <AudioOutlined style={{ color: '#52c41a' }} />
    if (mimeType.startsWith('text/')) return <FileTextOutlined style={{ color: '#faad14' }} />
    return <FileOutlined style={{ color: '#999' }} />
  }

  // 表格列定义
  const columns: ColumnsType<FileItem> = [
    {
      title: '文件名',
      key: 'name',
      width: 300,
      render: (_, record) => (
        <Space>
          {getFileIcon(record.mime_type)}
          <div>
            <div style={{ fontWeight: 500 }}>{record.name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.bucket}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      render: (size: number) => formatFileSize(size),
    },
    {
      title: '类型',
      dataIndex: 'mime_type',
      key: 'mime_type',
      width: 150,
      render: (mime: string) => <Tag>{mime}</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    getActionColumn<FileItem>(
      (record) => [
        {
          key: 'delete',
          label: '删除',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => handleDelete(record),
        },
      ],
      { width: 120, maxVisible: 1 }
    ),
  ]

  // 总存储大小
  const totalSize = files.reduce((sum, f) => sum + f.size, 0)

  return (
    <div style={{ padding: 24 }}>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="总文件数"
              value={pagination.total}
              prefix={<FileOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="总存储"
              value={formatFileSize(totalSize)}
              prefix={<InboxOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="图片文件"
              value={files.filter(f => f.mime_type.startsWith('image/')).length}
              prefix={<PictureOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="搜索文件名"
            value={filters.keyword}
            onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
            onPressEnter={handleSearch}
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            allowClear
          />
          <Select
            placeholder="存储桶"
            value={filters.bucket}
            onChange={(value) => setFilters(prev => ({ ...prev, bucket: value }))}
            style={{ width: 120 }}
            allowClear
            options={[
              { label: 'public', value: 'public' },
              { label: 'private', value: 'private' },
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
          <Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadModalOpen(true)}>
            上传文件
          </Button>
          {selectedRowKeys.length > 0 && (
            <Popconfirm
              title="确认批量删除"
              description={`确定要删除选中的 ${selectedRowKeys.length} 个文件吗？`}
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
        <Button icon={<ReloadOutlined />} onClick={loadFiles} loading={loading}>
          刷新
        </Button>
      </div>

      {/* 文件表格 */}
      <Table
        columns={columns}
        dataSource={files}
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
        scroll={{ x: 1000 }}
      />

      {/* 上传弹窗 */}
      <Modal
        title="上传文件"
        open={uploadModalOpen}
        onCancel={() => setUploadModalOpen(false)}
        footer={null}
        width={500}
      >
        <Dragger
          beforeUpload={handleUpload}
          showUploadList={false}
          multiple
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持单个或批量上传
          </p>
        </Dragger>
      </Modal>
    </div>
  )
}

export default FileManagement
