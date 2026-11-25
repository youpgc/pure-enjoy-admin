import React, { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { handleApiError } from '../../utils/apiClient'
import { useMounted } from '../../hooks/useMounted'
import { usePermission } from '../../hooks/usePermission'
import { journeyDailyMapService } from '../../services/gameService'
import type { DbJourneyDailyMap } from '../../types/database'
import type { JourneyLookups } from './journeyTabSchema'
import common from '../../styles/common.module.css'

const { Text } = Typography

/// 每日游历地图：怪物池以多选方式维护（空=全怪池兜底），妖王不进每日池。
const JourneyDailyMapTab: React.FC<{ lookups: JourneyLookups }> = ({ lookups }) => {
  const mountedRef = useMounted()
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('games:write')
  const [form] = Form.useForm()
  const [rows, setRows] = useState<DbJourneyDailyMap[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<DbJourneyDailyMap | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await journeyDailyMapService.findAll()
      if (!res.success) {
        handleApiError(res.errorMessage, 'JourneyDailyMap-加载')
        return
      }
      if (!mountedRef.current) return
      const sorted = [...(res.data ?? [])].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
      setRows(sorted)
    } catch (error) {
      handleApiError(error, 'JourneyDailyMap-加载')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [mountedRef])

  useEffect(() => { load() }, [load])

  const mobOptions = lookups.monsters
    .filter((m) => m.tier !== 'boss')
    .map((m) => ({ value: m.value, label: m.label }))

  const columns: ColumnsType<DbJourneyDailyMap> = [
    { title: '地图', key: 'name', width: 180, render: (_: unknown, r) => (
      <Space>
        <Tag color="cyan">游历</Tag>
        <Text strong>{r.name}</Text>
        <Text type="secondary">（{r.code}）</Text>
      </Space>
    ) },
    { title: '主题色', dataIndex: 'theme_color', key: 'theme_color', width: 110 },
    {
      title: (
        <Tooltip title="进关播报用的累计里数，同时驱动刷怪密度 0~4 档；不是通关条件。">
          里程碑里数
        </Tooltip>
      ),
      dataIndex: 'milestone_li',
      key: 'milestone_li',
      width: 110,
    },
    {
      title: '怪物池',
      key: 'monster_pool',
      width: 110,
      render: (_: unknown, r) => {
        const n = (r.monster_pool ?? '').split(',').map((s) => s.trim()).filter(Boolean).length
        return n > 0 ? <Tag color="blue">{n} 种</Tag> : <Text type="secondary">全怪池</Text>
      },
    },
    { title: '排序', dataIndex: 'sort', key: 'sort', width: 80 },
    {
      title: '启用',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 80,
      render: (v: boolean | null) => (v !== false ? <Tag color="green">开放</Tag> : <Tag>禁用</Tag>),
    },
    {
      title: '操作',
      key: 'action',
      width: 90,
      render: (_: unknown, r) => (
        <Button
          size="small"
          disabled={!canWrite}
          onClick={() => {
            setEditing(r)
            setModalOpen(true)
          }}
        >
          编辑
        </Button>
      ),
    },
  ]

  const openAdd = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (saving) return
    let values: Record<string, any>
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    setSaving(true)
    try {
      const payload = {
        code: values.code,
        name: values.name,
        theme_color: values.theme_color || '#E8C470',
        milestone_li: values.milestone_li ?? 0,
        description: values.description ?? '',
        sort: values.sort ?? 0,
        enabled: values.enabled ?? true,
        monster_pool: (values.monster_pool ?? []).join(','),
      }
      const res = editing
        ? await journeyDailyMapService.update(editing.id, payload)
        : await journeyDailyMapService.create(payload)
      if (!res.success) {
        handleApiError(res.errorMessage, 'JourneyDailyMap-保存')
        return
      }
      message.success('游历地图已保存')
      setModalOpen(false)
      setEditing(null)
      form.resetFields()
      load()
    } catch (error) {
      handleApiError(error, 'JourneyDailyMap-保存')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Alert
        type="info"
        showIcon
        className={common.mb16}
        message="每日游历地图（原「关卡配置 → 模式关卡」入口已迁入此处）"
        description="怪物池留空=引擎全怪池兜底；这里只列普通/精英怪，妖王不进每日游历。"
      />
      <Card>
        <div className={common.toolbar}>
          <Space wrap>
            <Button onClick={load} loading={loading}>刷新</Button>
            <Text type="secondary">共 {rows.length} 张</Text>
          </Space>
          <Button type="primary" disabled={!canWrite} onClick={openAdd}>新增</Button>
        </div>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 900 }}
          size="small"
        />
      </Card>
      <Modal
        title={editing ? `游历地图 · ${editing.name}` : '新增游历地图'}
        open={modalOpen}
        onOk={handleSave}
        confirmLoading={saving}
        okButtonProps={{ disabled: !canWrite }}
        afterOpenChange={(open) => {
          if (!open) return
          form.resetFields()
          form.setFieldsValue({
            code: editing?.code ?? '',
            name: editing?.name ?? '',
            theme_color: editing?.theme_color ?? '',
            milestone_li: editing?.milestone_li ?? 0,
            description: editing?.description ?? '',
            sort: editing?.sort ?? 0,
            enabled: editing?.enabled ?? true,
            monster_pool: (editing?.monster_pool ?? '').split(',').map((s) => s.trim()).filter(Boolean),
          })
        }}
        onCancel={() => {
          setModalOpen(false)
          setEditing(null)
          form.resetFields()
        }}
        width={620}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="code" label="地图编码" rules={[{ required: true, message: '请填写地图编码' }]}>
            <Input placeholder="如 huaguoshan" disabled={!!editing} />
          </Form.Item>
          <Form.Item name="name" label="地图名称" rules={[{ required: true, message: '请填写地图名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="theme_color" label="主题色（hex，驱动地图渲染）">
            <Input placeholder="#6FBF9A" />
          </Form.Item>
          <Form.Item
            name="milestone_li"
            label="里程碑里数（进关播报）"
            tooltip="同时驱动每日游历的刷怪密度分档（0~4 档）；不是通关条件。"
          >
            <InputNumber min={0} className={common.fullWidth} />
          </Form.Item>
          <Form.Item name="monster_pool" label="怪物池（多选；空=全怪池）">
            <Select
              mode="multiple"
              showSearch
              optionFilterProp="label"
              allowClear
              placeholder="不选=全怪池"
              options={mobOptions}
            />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="sort" label="排序">
            <InputNumber min={0} className={common.fullWidth} />
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch checkedChildren="开放" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default JourneyDailyMapTab
