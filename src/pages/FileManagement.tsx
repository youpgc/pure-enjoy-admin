import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Upload,
  Space,
  message,
  Tag,
  Image,
  Descriptions,
  Alert,
  Progress,
  Tooltip,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  LinkOutlined,
  UploadOutlined,
  FileTextOutlined,
  FileZipOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  FilePptOutlined,
  FileImageOutlined,
  FileUnknownOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { supabase, logOperation } from '../utils/supabase'
import { getActionColumn } from '../components/ActionColumn'
import type { UploadFile, UploadProps } from 'antd/es/upload'
import dayjs from 'dayjs'

const { Option } = Select

// ==================== 类型定义 ====================

interface FileRecord {
  id: string
  file_name: string
  original_name: string
  file_type: string
  file_category: string
  mime_type: string
  size: number
  url: string
  thumbnail_url?: string
  description?: string
  uploaded_by?: string
  created_at: string
  updated_at: string
}

interface FileTypeDict {
  code: string
  label: string
  value: string
  extra_data?: {
    icon?: string
    color?: string
    accept?: string
    maxSize?: number
  }
}

interface FileAssociation {
  id: string
  file_id: string
  entity_type: string
  entity_id: string
  entity_title?: string
  created_at: string
}

// ==================== 文件图标映射 ====================

const getFileIcon = (mimeType: string, fileName: string) => {
  if (mimeType.startsWith('image/')) return <FileImageOutlined style={{ color: '#52c41a' }} />
  if (mimeType.includes('pdf')) return <FilePdfOutlined style={{ color: '#ff4d4f' }} />
  if (mimeType.includes('word') || fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
    return <FileWordOutlined style={{ color: '#1890ff' }} />
  }
  if (mimeType.includes('excel') || fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
    return <FileExcelOutlined style={{ color: '#52c41a' }} />
  }
  if (mimeType.includes('powerpoint') || fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) {
    return <FilePptOutlined style={{ color: '#fa8c16' }} />
  }
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) {
    return <FileZipOutlined style={{ color: '#722ed1' }} />
  }
  if (mimeType.startsWith('text/')) return <FileTextOutlined style={{ color: '#8c8c8c' }} />
  return <FileUnknownOutlined style={{ color: '#8c8c8c' }} />
}

// ==================== 格式化文件大小 ====================

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// ==================== 主组件 ====================

const FileManagement: React.FC = () => {
  // 状态
  const [files, setFiles] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [fileTypes, setFileTypes] = useState<FileTypeDict[]>([])
  const [uploadModalVisible, setUploadModalVisible] = useState(false)
  const [previewModalVisible, setPreviewModalVisible] = useState(false)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null)
  const [associations, setAssociations] = useState<FileAssociation[]>([])
  const [checkingAssociations, setCheckingAssociations] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [searchText, setSearchText] = useState('')
  const [filterType, setFilterType] = useState<string>('')
  const [form] = Form.useForm()
  const [fileList, setFileList] = useState<UploadFile[]>([])

  // 加载文件类型字典
  const loadFileTypes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('dict_items')
        .select('code, label, value, extra_data')
        .eq('type_id', (
          await supabase
            .from('dict_types')
            .select('id')
            .eq('code', 'file_type')
            .single()
        ).data?.id || '')
        .eq('status', 'active')
        .order('sort_order', { ascending: true })

      if (error) throw error
      setFileTypes(data || [])
    } catch (error: any) {
      console.error('加载文件类型失败:', error)
      // 设置默认类型
      setFileTypes([
        { code: 'novel_cover', label: '小说封面', value: 'novel_cover' },
        { code: 'user_avatar', label: '用户头像', value: 'user_avatar' },
        { code: 'other', label: '其他', value: 'other' },
      ])
    }
  }, [])

  // 加载文件列表
  const loadFiles = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('files')
        .select('*')
        .order('created_at', { ascending: false })

      if (filterType) {
        query = query.eq('file_type', filterType)
      }
      if (searchText) {
        query = query.or(`file_name.ilike.%${searchText}%,original_name.ilike.%${searchText}%`)
      }

      const { data, error } = await query

      if (error) throw error
      setFiles(data || [])
    } catch (error: any) {
      message.error('加载文件列表失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }, [filterType, searchText])

  // 检查文件关联
  const checkFileAssociations = async (fileId: string): Promise<FileAssociation[]> => {
    try {
      // 查询小说封面关联
      const { data: novels, error: novelError } = await supabase
        .from('novels')
        .select('id, title, cover_url')
        .eq('cover_url', fileId)

      if (novelError) throw novelError

      // 查询用户头像关联
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, nickname, avatar_url')
        .eq('avatar_url', fileId)

      if (userError) throw userError

      const associations: FileAssociation[] = []

      novels?.forEach((novel: any) => {
        associations.push({
          id: `novel_${novel.id}`,
          file_id: fileId,
          entity_type: 'novel',
          entity_id: novel.id,
          entity_title: novel.title,
          created_at: new Date().toISOString(),
        })
      })

      users?.forEach((user: any) => {
        associations.push({
          id: `user_${user.id}`,
          file_id: fileId,
          entity_type: 'user',
          entity_id: user.id,
          entity_title: user.nickname || user.id,
          created_at: new Date().toISOString(),
        })
      })

      return associations
    } catch (error) {
      console.error('检查关联失败:', error)
      return []
    }
  }

  useEffect(() => {
    loadFileTypes()
    loadFiles()
  }, [loadFileTypes, loadFiles])

  // 上传文件到 Supabase Storage
  const handleUpload = async (values: any) => {
    if (fileList.length === 0) {
      message.error('请选择要上传的文件')
      return
    }

    const file = fileList[0]?.originFileObj
    if (!file) {
      message.error('文件对象无效')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // 生成唯一文件名
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`
      const filePath = `${values.file_type || 'other'}/${fileName}`

      // 上传到 Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      setUploadProgress(50)

      // 获取文件URL
      const { data: urlData } = supabase.storage.from('files').getPublicUrl(filePath)
      const fileUrl = urlData.publicUrl

      // 生成缩略图（如果是图片）
      let thumbnailUrl = ''
      if (file.type.startsWith('image/')) {
        thumbnailUrl = fileUrl
      }

      setUploadProgress(80)

      // 写入文件元数据表
      const { error: dbError } = await supabase
        .from('files')
        .insert({
          file_name: fileName,
          original_name: file.name,
          file_type: values.file_type || 'other',
          file_category: values.file_category || 'other',
          mime_type: file.type || 'application/octet-stream',
          size: file.size,
          url: fileUrl,
          thumbnail_url: thumbnailUrl,
          description: values.description || '',
        })

      if (dbError) throw dbError

      setUploadProgress(100)
      message.success('文件上传成功')
      logOperation({ action: 'create', module: 'files', detail: `上传文件: ${file.name}` })

      setUploadModalVisible(false)
      setFileList([])
      form.resetFields()
      loadFiles()
    } catch (error: any) {
      message.error('上传失败: ' + error.message)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  // 打开删除确认弹窗
  const openDeleteModal = async (file: FileRecord) => {
    setSelectedFile(file)
    setCheckingAssociations(true)
    setDeleteModalVisible(true)

    const assocs = await checkFileAssociations(file.id)
    setAssociations(assocs)
    setCheckingAssociations(false)
  }

  // 删除文件
  const handleDelete = async () => {
    if (!selectedFile) return

    try {
      // 1. 删除 Storage 中的文件
      const filePath = `${selectedFile.file_type}/${selectedFile.file_name}`
      const { error: storageError } = await supabase.storage
        .from('files')
        .remove([filePath])

      if (storageError) {
        console.warn('删除存储文件失败:', storageError)
      }

      // 2. 删除数据库记录
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', selectedFile.id)

      if (dbError) throw dbError

      message.success('文件删除成功')
      logOperation({ action: 'delete', module: 'files', detail: `删除文件: ${selectedFile.original_name}` })

      setDeleteModalVisible(false)
      setSelectedFile(null)
      setAssociations([])
      loadFiles()
    } catch (error: any) {
      message.error('删除失败: ' + error.message)
    }
  }

  // 预览文件
  const handlePreview = (file: FileRecord) => {
    setSelectedFile(file)
    setPreviewModalVisible(true)
  }

  // 上传配置
  const uploadProps: UploadProps = {
    onRemove: () => {
      setFileList([])
    },
    beforeUpload: (file) => {
      setFileList([{ uid: file.uid, name: file.name, status: 'done', originFileObj: file }])
      return false
    },
    fileList,
    maxCount: 1,
  }

  // 表格列定义
  const columns = [
    {
      title: '文件',
      dataIndex: 'original_name',
      key: 'original_name',
      width: 300,
      render: (text: string, record: FileRecord) => (
        <Space>
          {getFileIcon(record.mime_type, text)}
          <Tooltip title={text}>
            <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>
              {text}
            </span>
          </Tooltip>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'file_type',
      key: 'file_type',
      width: 120,
      render: (type: string) => {
        const typeInfo = fileTypes.find(t => t.value === type)
        return <Tag color="blue">{typeInfo?.label || type}</Tag>
      },
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      render: (size: number) => formatFileSize(size),
    },
    {
      title: '预览',
      dataIndex: 'thumbnail_url',
      key: 'thumbnail_url',
      width: 80,
      render: (url: string, record: FileRecord) => {
        if (record.mime_type?.startsWith('image/') && url) {
          return (
            <Image
              src={url}
              alt="预览"
              width={50}
              height={50}
              style={{ objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }}
              preview={{ src: record.url }}
            />
          )
        }
        return <Tag>无预览</Tag>
      },
    },
    {
      title: '关联',
      dataIndex: 'id',
      key: 'associations',
      width: 100,
      render: (id: string) => (
        <Button
          type="link"
          icon={<LinkOutlined />}
          onClick={async () => {
            const assocs = await checkFileAssociations(id)
            if (assocs.length > 0) {
              Modal.info({
                title: '文件关联',
                content: (
                  <div>
                    {assocs.map((assoc) => (
                      <Tag key={assoc.id} color="green">
                        {assoc.entity_type === 'novel' ? '📖' : '👤'} {assoc.entity_title}
                      </Tag>
                    ))}
                  </div>
                ),
              })
            } else {
              message.info('暂无关联')
            }
          }}
        >
          查看
        </Button>
      ),
    },
    {
      title: '上传时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    getActionColumn<FileRecord>(
      (record) => [
        {
          key: 'preview',
          label: '预览',
          icon: <EyeOutlined />,
          onClick: () => handlePreview(record),
        },
        {
          key: 'delete',
          label: '删除',
          icon: <DeleteOutlined />,
          danger: true,
          onClick: () => openDeleteModal(record),
        },
      ],
      { width: 180, maxVisible: 2 }
    ),
  ]

  return (
    <Card>
      {/* 工具栏 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setUploadModalVisible(true)}>
            上传文件
          </Button>
          <Input
            placeholder="搜索文件名"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={loadFiles}
            style={{ width: 200 }}
          />
          <Select
            placeholder="文件类型"
            allowClear
            style={{ width: 150 }}
            value={filterType}
            onChange={(value) => setFilterType(value)}
          >
            {fileTypes.map((type) => (
              <Option key={type.value} value={type.value}>{type.label}</Option>
            ))}
          </Select>
          <Button icon={<ReloadOutlined />} onClick={loadFiles}>
            刷新
          </Button>
        </Space>
        <Tag>共 {files.length} 个文件</Tag>
      </div>

      {/* 文件列表 */}
      <Table
        columns={columns}
        dataSource={files}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
      />

      {/* 上传弹窗 */}
      <Modal
        title="上传文件"
        open={uploadModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setUploadModalVisible(false)
          setFileList([])
          form.resetFields()
        }}
        confirmLoading={uploading}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleUpload}>
          <Form.Item
            name="file"
            label="选择文件"
            rules={[{ required: true, message: '请选择文件' }]}
          >
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
          </Form.Item>

          <Form.Item
            name="file_type"
            label="文件类型"
            rules={[{ required: true, message: '请选择文件类型' }]}
          >
            <Select placeholder="选择文件类型">
              {fileTypes.map((type) => (
                <Option key={type.value} value={type.value}>{type.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="file_category" label="文件分类">
            <Select placeholder="选择文件分类" allowClear>
              <Option value="image">图片</Option>
              <Option value="document">文档</Option>
              <Option value="other">其他</Option>
            </Select>
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="文件描述（可选）" />
          </Form.Item>

          {uploading && (
            <Form.Item>
              <Progress percent={uploadProgress} status="active" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* 预览弹窗 */}
      <Modal
        title="文件预览"
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewModalVisible(false)}>
            关闭
          </Button>,
          <Button
            key="download"
            type="primary"
            onClick={() => {
              if (selectedFile?.url) {
                window.open(selectedFile.url, '_blank')
              }
            }}
          >
            下载
          </Button>,
        ]}
        width={800}
      >
        {selectedFile && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="文件名" span={2}>{selectedFile.original_name}</Descriptions.Item>
            <Descriptions.Item label="文件类型">{selectedFile.file_type}</Descriptions.Item>
            <Descriptions.Item label="文件大小">{formatFileSize(selectedFile.size)}</Descriptions.Item>
            <Descriptions.Item label="MIME类型">{selectedFile.mime_type}</Descriptions.Item>
            <Descriptions.Item label="上传时间">{dayjs(selectedFile.created_at).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
            <Descriptions.Item label="描述" span={2}>{selectedFile.description || '-'}</Descriptions.Item>
          </Descriptions>
        )}
        {selectedFile?.mime_type?.startsWith('image/') && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Image src={selectedFile.url} alt={selectedFile.original_name} style={{ maxWidth: '100%' }} />
          </div>
        )}
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        title="确认删除"
        open={deleteModalVisible}
        onOk={handleDelete}
        onCancel={() => {
          setDeleteModalVisible(false)
          setSelectedFile(null)
          setAssociations([])
        }}
        confirmLoading={checkingAssociations}
        okButtonProps={{ danger: true, disabled: associations.length > 0 }}
        okText="删除"
      >
        {checkingAssociations ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <div>正在检查文件关联...</div>
          </div>
        ) : (
          <>
            {associations.length > 0 ? (
              <Alert
                type="error"
                message="无法删除"
                description={
                  <div>
                    <p>该文件正在被以下资源使用，无法删除：</p>
                    <ul>
                      {associations.map((assoc) => (
                        <li key={assoc.id}>
                          {assoc.entity_type === 'novel' ? '📖 小说' : '👤 用户'}：
                          <strong>{assoc.entity_title}</strong>
                        </li>
                      ))}
                    </ul>
                    <p>请先解除关联后再删除文件。</p>
                  </div>
                }
              />
            ) : (
              <Alert
                type="warning"
                message="确认删除"
                description={`确定要删除文件 "${selectedFile?.original_name}" 吗？此操作不可恢复。`}
              />
            )}
          </>
        )}
      </Modal>
    </Card>
  )
}

export default FileManagement
