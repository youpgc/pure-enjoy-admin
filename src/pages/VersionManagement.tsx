import React, { useEffect, useState } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, Upload, Tag, Space,
  message, Popconfirm, QRCode, Tooltip, Card, Descriptions, Typography
} from 'antd'
import {
  UploadOutlined, DownloadOutlined, RollbackOutlined,
  QrcodeOutlined, PlusOutlined, HistoryOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined
} from '@ant-design/icons'
import { supabase } from '../utils/supabase'
import { usePermission } from '../hooks/usePermission'
import dayjs from 'dayjs'

const { TextArea } = Input
const { Text } = Typography

interface AppVersion {
  id: number
  version: string
  build_number: number
  release_type: 'hotfix' | 'feature' | 'force'
  release_notes: string
  apk_url: string | null
  apk_size: number
  status: 'draft' | 'released' | 'revoked'
  released_at: string | null
  revoked_at: string | null
  created_at: string
  created_by: string | null
  // 兼容字段（GitHub Actions 工作流创建的记录使用这些字段名）
  download_url?: string | null
  file_size?: number
  file_name?: string
  checksum?: string
  is_force_update?: boolean
  platform?: string
}

const releaseTypeMap: Record<string, { label: string; color: string }> = {
  hotfix: { label: '热更新', color: 'orange' },
  feature: { label: '功能迭代', color: 'blue' },
  force: { label: '强制更新', color: 'red' },
}

const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: '草稿', color: 'default', icon: <ClockCircleOutlined /> },
  released: { label: '已发布', color: 'green', icon: <CheckCircleOutlined /> },
  revoked: { label: '已撤回', color: 'red', icon: <CloseCircleOutlined /> },
}

const VersionManagement: React.FC = () => {
  const { canManageVersions } = usePermission()
  const [versions, setVersions] = useState<AppVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<AppVersion | null>(null)
  const [uploading, setUploading] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchVersions()
  }, [])

  const fetchVersions = async () => {
    setLoading(true)
    console.log('Fetching versions from Supabase...')
    const { data, error } = await supabase
      .from('app_versions')
      .select('*')
      .order('created_at', { ascending: false })
    console.log('Supabase response:', { data, error })
    if (error) {
      console.error('Error fetching versions:', error)
      message.error('加载版本列表失败: ' + error.message)
    } else {
      console.log('Versions loaded:', data?.length || 0, 'records')
      console.log('Raw data sample:', data?.[0])
      
      // 映射字段：将 GitHub Actions 创建的字段名转换为前端使用的字段名
      const mappedData = (data || []).map((item: any) => {
        // 处理发布时间：优先使用 released_at，否则使用 created_at
        const releasedAt = item.released_at || item.created_at || null
        
        // 处理版本状态
        const status = item.status || (item.is_active ? 'released' : 'draft')
        
        // 处理更新类型
        const releaseType = item.release_type || (item.is_force_update ? 'force' : 'feature')
        
        // 处理 APK 大小（确保是数字，且大于0）
        let apkSize = Number(item.apk_size || item.file_size || 0)
        // 如果 file_size 是字符串，尝试转换
        if (typeof item.file_size === 'string') {
          apkSize = parseInt(item.file_size, 10) || 0
        }
        
        return {
          ...item,
          apk_url: item.apk_url || item.download_url || null,
          apk_size: apkSize,
          release_type: releaseType,
          status: status,
          released_at: releasedAt,
          // 确保其他字段也有默认值
          version: item.version || '1.0.0',
          build_number: Number(item.build_number) || 1,
          release_notes: item.release_notes || '无更新说明',
        }
      })
      
      console.log('Mapped data:', mappedData)
      setVersions(mappedData)
    }
    setLoading(false)
  }

  const handleUpload = async (values: { version: string; build_number: number; release_type: string; release_notes: string; apk: { originFileObj: File }[] }) => {
    setUploading(true)
    try {
      const file = values.apk?.[0]?.originFileObj
      let apkUrl: string | null = null
      let apkSize = 0

      if (file) {
        const fileName = `pure-enjoy-v${values.version}-build${values.build_number}.apk`
        const { error: uploadError } = await supabase.storage
          .from('apk-releases')
          .upload(fileName, file, { upsert: true })

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('apk-releases')
          .getPublicUrl(fileName)
        apkUrl = urlData.publicUrl
        apkSize = file.size
      }

      const { error: insertError } = await supabase
        .from('app_versions')
        .insert({
          version: values.version,
          build_number: values.build_number,
          release_type: values.release_type,
          release_notes: values.release_notes || '',
          apk_url: apkUrl,
          apk_size: apkSize,
          status: 'draft',
        })

      if (insertError) throw insertError

      message.success('版本上传成功')
      setUploadModalOpen(false)
      form.resetFields()
      fetchVersions()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '未知错误'
      message.error(`上传失败: ${msg}`)
    }
    setUploading(false)
  }

  const handleRelease = async (record: AppVersion) => {
    try {
      // 先将其他所有已发布版本改为已下架
      const otherReleased = versions.filter(v => v.status === 'released' && v.id !== record.id)
      if (otherReleased.length > 0) {
        const otherIds = otherReleased.map(v => v.id)
        const { error: updateError } = await supabase
          .from('app_versions')
          .update({ status: 'revoked', revoked_at: new Date().toISOString() })
          .in('id', otherIds)
        if (updateError) console.error('下架旧版本失败:', updateError)
      }

      // 发布当前版本
      const { error } = await supabase
        .from('app_versions')
        .update({
          status: 'released',
          released_at: new Date().toISOString(),
        })
        .eq('id', record.id)

      if (error) throw error
      message.success(`v${record.version} 已发布，其他版本已下架`)
      fetchVersions()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '未知错误'
      message.error(`发布失败: ${msg}`)
    }
  }

  const handleRevoke = async (record: AppVersion) => {
    try {
      const { error } = await supabase
        .from('app_versions')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
        })
        .eq('id', record.id)

      if (error) throw error
      message.success(`v${record.version} 已撤回`)
      fetchVersions()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '未知错误'
      message.error(`撤回失败: ${msg}`)
    }
  }

  const handleRollback = async (record: AppVersion) => {
    try {
      const currentReleased = versions.find(v => v.status === 'released')
      if (currentReleased) {
        await supabase
          .from('app_versions')
          .update({ status: 'revoked', revoked_at: new Date().toISOString() })
          .eq('id', currentReleased.id)
      }

      const { error } = await supabase
        .from('app_versions')
        .update({
          status: 'released',
          released_at: new Date().toISOString(),
          revoked_at: null,
        })
        .eq('id', record.id)

      if (error) throw error
      message.success(`已回滚到 v${record.version}`)
      fetchVersions()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '未知错误'
      message.error(`回滚失败: ${msg}`)
    }
  }

  const showQrCode = (record: AppVersion) => {
    setSelectedVersion(record)
    setQrModalOpen(true)
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '-'
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const columns = [
    {
      title: '版本号',
      dataIndex: 'version',
      key: 'version',
      render: (v: string) => (
        <Text strong>v{v}</Text>
      ),
    },
    {
      title: '构建号',
      dataIndex: 'build_number',
      key: 'build_number',
    },
    {
      title: '更新类型',
      dataIndex: 'release_type',
      key: 'release_type',
      render: (type: string) => {
        const info = releaseTypeMap[type]
        return <Tag color={info?.color}>{info?.label}</Tag>
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const info = statusMap[status]
        return <Tag icon={info?.icon} color={info?.color}>{info?.label}</Tag>
      },
    },
    {
      title: 'APK大小',
      dataIndex: 'apk_size',
      key: 'apk_size',
      render: (size: number) => formatSize(size),
    },
    {
      title: '更新内容',
      dataIndex: 'release_notes',
      key: 'release_notes',
      ellipsis: true,
      width: 200,
    },
    {
      title: '发布时间',
      dataIndex: 'released_at',
      key: 'released_at',
      render: (date: string | null) =>
        date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '通用操作',
      key: 'common-action',
      render: (_: unknown, record: AppVersion) => (
        <Space size="small">
          {record.apk_url && (
            <Tooltip title="下载二维码">
              <Button
                size="small"
                icon={<QrcodeOutlined />}
                onClick={() => showQrCode(record)}
              />
            </Tooltip>
          )}
          {record.apk_url && (
            <Tooltip title="下载APK">
              <Button
                size="small"
                type="link"
                icon={<DownloadOutlined />}
                href={record.apk_url!}
                target="_blank"
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
    ...(canManageVersions ? [{
      title: '管理操作',
      key: 'manage-action',
      render: (_: unknown, record: AppVersion) => (
        <Space size="small">
          {record.status === 'draft' && record.apk_url && (
            <Tooltip title="发布此版本">
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleRelease(record)}
              >
                发布
              </Button>
            </Tooltip>
          )}
          {record.status === 'released' && (
            <Tooltip title="撤回此版本">
              <Popconfirm
                title="确认撤回"
                description="撤回后用户将不再收到此版本更新"
                onConfirm={() => handleRevoke(record)}
                okText="撤回"
                cancelText="取消"
                okButtonProps={{ danger: true }}
              >
                <Button size="small" danger icon={<CloseCircleOutlined />}>
                  撤回
                </Button>
              </Popconfirm>
            </Tooltip>
          )}
          {(record.status === 'released' || record.status === 'revoked') && record.apk_url && (
            <Tooltip title="回滚到此版本">
              <Popconfirm
                title="确认回滚"
                description={`将撤回当前版本并重新发布 v${record.version}，确定吗？`}
                onConfirm={() => handleRollback(record)}
                okText="回滚"
                cancelText="取消"
              >
                <Button size="small" icon={<RollbackOutlined />}>
                  回滚
                </Button>
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    }] : []),
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h3>版本管理</h3>
        <Space>
          <Button icon={<HistoryOutlined />} onClick={fetchVersions}>
            刷新
          </Button>
          {canManageVersions && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setUploadModalOpen(true)}
            >
              上传新版本
            </Button>
          )}
        </Space>
      </div>

      {(() => {
        const releasedVersion = versions
          .filter(v => v.status === 'released')
          .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0]
        if (!releasedVersion) return null
        return (
          <Card
            style={{ marginBottom: 16, background: '#f6ffed', borderColor: '#b7eb8f' }}
            size="small"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Descriptions
                size="small"
                column={4}
                title="当前线上版本"
                style={{ flex: 1 }}
              >
                <Descriptions.Item label="版本号">
                  <Text strong>v{releasedVersion.version}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="更新类型">
                  {(() => {
                    const info = releaseTypeMap[releasedVersion.release_type]
                    return <Tag color={info?.color}>{info?.label}</Tag>
                  })()}
                </Descriptions.Item>
                <Descriptions.Item label="发布时间">
                  {dayjs(releasedVersion.released_at).format('YYYY-MM-DD HH:mm')}
                </Descriptions.Item>
                <Descriptions.Item label="APK大小">
                  {formatSize(releasedVersion.apk_size || 0)}
                </Descriptions.Item>
              </Descriptions>
              {releasedVersion.apk_url && (
                <div style={{ marginLeft: 24, textAlign: 'center', flexShrink: 0 }}>
                  <QRCode
                    value={releasedVersion.apk_url}
                    size={120}
                    style={{ borderRadius: 4 }}
                  />
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>扫码下载</Text>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )
      })()}

      <Table
        columns={columns}
        dataSource={versions}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: 1200 }}
      />

      {canManageVersions && (
        <Modal
          title="上传新版本"
          open={uploadModalOpen}
          onCancel={() => { setUploadModalOpen(false); form.resetFields() }}
          onOk={() => form.submit()}
          confirmLoading={uploading}
          width={600}
          okText="上传"
        >
          <Form form={form} layout="vertical" onFinish={handleUpload}>
            <Form.Item
              name="version"
              label="版本号"
              rules={[{ required: true, message: '请输入版本号' }]}
            >
              <Input placeholder="例如: 1.0.1" />
            </Form.Item>
            <Form.Item
              name="build_number"
              label="构建号"
              rules={[{ required: true, message: '请输入构建号' }]}
              extra="每次构建递增，用于版本比较"
            >
              <Input type="number" placeholder="例如: 2" />
            </Form.Item>
            <Form.Item
              name="release_type"
              label="更新类型"
              rules={[{ required: true, message: '请选择更新类型' }]}
            >
              <Select placeholder="选择更新类型">
                <Select.Option value="hotfix">热更新 - Bug修复</Select.Option>
                <Select.Option value="feature">功能迭代 - 新功能</Select.Option>
                <Select.Option value="force">强制更新 - 必须升级</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="release_notes"
              label="更新内容"
            >
              <TextArea
                rows={4}
                placeholder="请描述本次更新内容..."
              />
            </Form.Item>
            <Form.Item
              name="apk"
              label="APK文件"
              rules={[{ required: true, message: '请上传APK文件' }]}
            >
              <Upload
                maxCount={1}
                accept=".apk"
                beforeUpload={() => false}
              >
                <Button icon={<UploadOutlined />}>选择APK文件</Button>
              </Upload>
            </Form.Item>
          </Form>
        </Modal>
      )}

      <Modal
        title="扫码下载"
        open={qrModalOpen}
        onCancel={() => setQrModalOpen(false)}
        footer={null}
        width={400}
      >
        {selectedVersion && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <QRCode
              value={selectedVersion.apk_url || ''}
              size={240}
              style={{ marginBottom: 16 }}
            />
            <p>
              <Text strong>v{selectedVersion.version}</Text>
              <Text type="secondary" style={{ marginLeft: 8 }}>
                ({formatSize(selectedVersion.apk_size)})
              </Text>
            </p>
            <p>
              <Text type="secondary">使用手机扫描二维码下载安装</Text>
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default VersionManagement
