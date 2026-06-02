import React, { useEffect, useState } from 'react'
import {
  Table, Button, Modal, Form, Input, InputNumber, Select, Tag, Space,
  message, Switch, Divider, Typography
} from 'antd'
import {
  PlusOutlined, EditOutlined, ReloadOutlined, StopOutlined, EyeOutlined
} from '@ant-design/icons'
import { supabase } from '../utils/supabase'
import { getActionColumn } from '../components/ActionColumn'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography

const { TextArea } = Input

interface AppConfig {
  id: string
  config_key: string
  title: string
  content: string | null
  config_type: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

const configTypeMap: Record<string, { label: string; color: string }> = {
  rich_text: { label: '富文本', color: 'blue' },
  html: { label: 'HTML', color: 'purple' },
  json: { label: 'JSON', color: 'orange' },
  text: { label: '纯文本', color: 'default' },
}

const AppConfigs: React.FC = () => {
  const [configs, setConfigs] = useState<AppConfig[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<AppConfig | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [previewConfig, setPreviewConfig] = useState<AppConfig | null>(null)

  useEffect(() => {
    fetchConfigs()
  }, [])

  const fetchConfigs = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('app_configs')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      message.error('加载配置列表失败: ' + error.message)
    } else {
      setConfigs(data || [])
    }
    setLoading(false)
  }

  const handleToggleActive = async (record: AppConfig) => {
    try {
      const { error } = await supabase
        .from('app_configs')
        .update({ is_active: !record.is_active })
        .eq('id', record.id)

      if (error) throw error
      message.success(`已${record.is_active ? '停用' : '启用'}「${record.title}」`)
      fetchConfigs()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '未知错误'
      message.error(`操作失败: ${msg}`)
    }
  }

  const handleEdit = (record: AppConfig) => {
    setEditingRecord(record)
    form.setFieldsValue({
      config_key: record.config_key,
      title: record.title,
      content: record.content || '',
      config_type: record.config_type || 'rich_text',
      sort_order: record.sort_order,
      is_active: record.is_active,
    })
    setModalOpen(true)
  }

  // 预览配置
  const handlePreview = (record: AppConfig) => {
    setPreviewConfig(record)
    setPreviewModalOpen(true)
  }

  // 渲染预览内容
  const renderPreviewContent = () => {
    if (!previewConfig?.content) {
      return <Text type="secondary">暂无内容</Text>
    }

    switch (previewConfig.config_type) {
      case 'rich_text':
        return (
          <div
            style={{
              padding: 16,
              background: '#fff',
              borderRadius: 8,
              lineHeight: 1.8,
              maxHeight: 500,
              overflow: 'auto',
            }}
            dangerouslySetInnerHTML={{ __html: previewConfig.content }}
          />
        )
      case 'html':
        return (
          <iframe
            srcDoc={previewConfig.content}
            style={{
              width: '100%',
              height: 500,
              border: '1px solid #d9d9d9',
              borderRadius: 8,
            }}
            title="HTML Preview"
          />
        )
      case 'json':
        return (
          <pre
            style={{
              padding: 16,
              background: '#f5f5f5',
              borderRadius: 8,
              maxHeight: 500,
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: 13,
            }}
          >
            {JSON.stringify(JSON.parse(previewConfig.content), null, 2)}
          </pre>
        )
      case 'text':
      default:
        return (
          <Paragraph
            style={{
              padding: 16,
              background: '#fafafa',
              borderRadius: 8,
              maxHeight: 500,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
            }}
          >
            {previewConfig.content}
          </Paragraph>
        )
    }
  }

  const handleAdd = () => {
    setEditingRecord(null)
    form.resetFields()
    form.setFieldsValue({
      config_type: 'rich_text',
      sort_order: configs.length > 0 ? Math.max(...configs.map(c => c.sort_order)) + 1 : 0,
      is_active: true,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: {
    config_key: string
    title: string
    content: string
    config_type: string
    sort_order: number
    is_active: boolean
  }) => {
    setSubmitting(true)
    try {
      if (editingRecord) {
        // 更新
        const { error } = await supabase
          .from('app_configs')
          .update({
            title: values.title,
            content: values.content,
            config_type: values.config_type,
            sort_order: values.sort_order,
            is_active: values.is_active,
          })
          .eq('id', editingRecord.id)

        if (error) throw error
        message.success('更新成功')
      } else {
        // 新增
        const { error } = await supabase
          .from('app_configs')
          .insert({
            config_key: values.config_key,
            title: values.title,
            content: values.content,
            config_type: values.config_type,
            sort_order: values.sort_order,
            is_active: values.is_active,
          })

        if (error) throw error
        message.success('新增成功')
      }

      setModalOpen(false)
      form.resetFields()
      setEditingRecord(null)
      fetchConfigs()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '未知错误'
      message.error(`${editingRecord ? '更新' : '新增'}失败: ${msg}`)
    }
    setSubmitting(false)
  }

  const handleDelete = async (record: AppConfig) => {
    try {
      const { error } = await supabase
        .from('app_configs')
        .delete()
        .eq('id', record.id)

      if (error) throw error
      message.success('删除成功')
      fetchConfigs()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '未知错误'
      message.error(`删除失败: ${msg}`)
    }
  }

  const columns = [
    {
      title: '配置键',
      dataIndex: 'config_key',
      key: 'config_key',
      width: 180,
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{v}</span>,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 160,
      render: (v: string) => <strong>{v}</strong>,
    },
    {
      title: '类型',
      dataIndex: 'config_type',
      key: 'config_type',
      width: 100,
      render: (type: string) => {
        const info = configTypeMap[type]
        return <Tag color={info?.color || 'default'}>{info?.label || type || '-'}</Tag>
      },
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 80,
      sorter: (a: AppConfig, b: AppConfig) => a.sort_order - b.sort_order,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean, record: AppConfig) => (
        <Switch
          checked={isActive}
          checkedChildren="启用"
          unCheckedChildren="停用"
          onChange={() => handleToggleActive(record)}
        />
      ),
    },
    {
      title: '内容摘要',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      width: 200,
      render: (content: string | null) =>
        content ? (content.length > 50 ? content.substring(0, 50) + '...' : content) : '-',
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 170,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    getActionColumn<any>(
      (record: any) => [
        {
          key: 'preview',
          label: '预览',
          icon: <EyeOutlined />,
          type: 'default' as const,
          onClick: () => handlePreview(record),
        },
        {
          key: 'edit',
          label: '编辑',
          icon: <EditOutlined />,
          type: 'primary' as const,
          onClick: () => handleEdit(record),
        },
        {
          key: 'delete',
          label: '删除',
          icon: <StopOutlined />,
          danger: true,
          onClick: () => handleDelete(record),
        },
      ],
      { width: 280, maxVisible: 2 }
    ),
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h3>内容管理</h3>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchConfigs}>
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            新增配置
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={configs}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 1100 }}
      />

      <Modal
        title={editingRecord ? '编辑配置' : '新增配置'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false)
          form.resetFields()
          setEditingRecord(null)
        }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={720}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="config_key"
            label="配置键 (config_key)"
            rules={[{ required: true, message: '请输入配置键' }]}
            extra="唯一标识，创建后不可修改"
          >
            <Input
              placeholder="例如: user_agreement"
              disabled={!!editingRecord}
            />
          </Form.Item>
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="例如: 用户协议" />
          </Form.Item>
          <Form.Item
            name="config_type"
            label="配置类型"
            rules={[{ required: true, message: '请选择配置类型' }]}
          >
            <Select placeholder="选择配置类型">
              <Select.Option value="rich_text">富文本</Select.Option>
              <Select.Option value="html">HTML</Select.Option>
              <Select.Option value="json">JSON</Select.Option>
              <Select.Option value="text">纯文本</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="sort_order"
            label="排序值"
            extra="数值越小越靠前"
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
          </Form.Item>
          <Form.Item
            name="is_active"
            label="是否启用"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
          <Form.Item
            name="content"
            label="内容"
          >
            <TextArea
              rows={12}
              placeholder="请输入配置内容..."
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 配置预览弹窗 */}
      <Modal
        title={
          <Space>
            <EyeOutlined />
            <span>配置预览</span>
            {previewConfig && (
              <Tag color={configTypeMap[previewConfig.config_type || '']?.color || 'default'}>
                {configTypeMap[previewConfig.config_type || '']?.label || '纯文本'}
              </Tag>
            )}
          </Space>
        }
        open={previewModalOpen}
        onCancel={() => {
          setPreviewModalOpen(false)
          setPreviewConfig(null)
        }}
        footer={null}
        width={800}
      >
        {previewConfig && (
          <div>
            <Title level={5}>{previewConfig.title}</Title>
            <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
              配置键: <code>{previewConfig.config_key}</code>
            </Text>
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ marginTop: 16 }}>
              {renderPreviewContent()}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default AppConfigs
