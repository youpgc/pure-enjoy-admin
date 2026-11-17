import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { handleApiError } from '../../utils/apiClient'
import { useMounted } from '../../hooks/useMounted'
import { usePermission } from '../../hooks/usePermission'
import { getActionColumn } from '../../components/common/ActionColumn'
import { journeyBattleParamService, type DbJourneyBattleParam } from '../../services/journeyConfigService'
import {
  JOURNEY_BATTLE_PARAM_GROUPS,
  type BattleParamDef,
  type BattleParamGroupDef,
} from '../../constants/journeyBattleParams'
import common from '../../styles/common.module.css'

const { Text } = Typography

interface JourneyBattleParamsTabProps {
  /// 当前二级 tab 对应的分组码；组件只管理该组参数
  groupCode: string
}

interface ParamRow {
  key: string
  code: string
  label: string
  def: BattleParamDef
  /// 已落库的行（null=未配置，回落默认）
  record: DbJourneyBattleParam | null
  value: number | null
  enabled: boolean
}

/// 通用战斗参数编辑器：按分组展示参数字典，未配置显示默认值占位；
/// 「新增」从组内字典选择参数键 + 填数值，行内可编辑/重置（重置=删行回落默认）。
const JourneyBattleParamsTab: React.FC<JourneyBattleParamsTabProps> = ({ groupCode }) => {
  const mountedRef = useMounted()
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('games:write')
  const canDelete = hasPermission('games:delete')

  const group = useMemo<BattleParamGroupDef | undefined>(
    () => JOURNEY_BATTLE_PARAM_GROUPS.find((g) => g.code === groupCode),
    [groupCode],
  )

  const [rows, setRows] = useState<DbJourneyBattleParam[]>([])
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ParamRow | null>(null)
  const [selectedCode, setSelectedCode] = useState<string | undefined>(undefined)
  const [saving, setSaving] = useState(false)

  const loadRows = useCallback(async () => {
    setLoading(true)
    try {
      const res = await journeyBattleParamService.findAll((q) =>
        q.eq('group_code', groupCode),
      )
      if (!res.success) {
        handleApiError(res.errorMessage, `JourneyConfig-战斗参数-${groupCode}-加载`)
        return
      }
      if (mountedRef.current) setRows(res.data ?? [])
    } catch (error) {
      handleApiError(error, `JourneyConfig-战斗参数-${groupCode}-加载`)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [groupCode, mountedRef])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  const byCode = useMemo(() => {
    const map: Record<string, DbJourneyBattleParam> = {}
    for (const r of rows) map[r.param_code] = r
    return map
  }, [rows])

  const paramRows = useMemo<ParamRow[]>(
    () =>
      (group?.params ?? []).map((def) => {
        const record = byCode[def.code] ?? null
        return {
          key: `${groupCode}.${def.code}`,
          code: def.code,
          label: def.label,
          def,
          record,
          value: record?.value_num ?? null,
          enabled: record?.enabled ?? true,
        }
      }),
    [group, groupCode, byCode],
  )

  const openAdd = () => {
    const unconfigured = (group?.params ?? []).filter((p) => !byCode[p.code])
    setEditing(null)
    setSelectedCode(unconfigured[0]?.code)
    form.resetFields()
    form.setFieldsValue({ enabled: true })
    setModalOpen(true)
  }

  const openEdit = (row: ParamRow) => {
    setEditing(row)
    setSelectedCode(row.code)
    form.resetFields()
    form.setFieldsValue({
      value: row.value ?? row.def.default,
      enabled: row.enabled,
      remark: row.record?.remark ?? '',
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (saving) return
    let values: { value?: number; enabled?: boolean; remark?: string }
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    if (!selectedCode) {
      message.warning('请选择参数')
      return
    }
    const def = group?.params.find((p) => p.code === selectedCode)
    const valueNum = values.value ?? def?.default ?? 0
    setSaving(true)
    try {
      if (editing?.record) {
        const res = await journeyBattleParamService.update(editing.record.id, {
          value_num: valueNum,
          enabled: values.enabled ?? true,
          remark: values.remark?.trim() || null,
        })
        if (!res.success) {
          handleApiError(res.errorMessage, 'JourneyConfig-战斗参数-更新')
          return
        }
        message.success('已保存')
      } else {
        const res = await journeyBattleParamService.create({
          group_code: groupCode,
          param_code: selectedCode,
          value_num: valueNum,
          value_text: null,
          enabled: values.enabled ?? true,
          remark: values.remark?.trim() || null,
        })
        if (!res.success) {
          handleApiError(res.errorMessage, 'JourneyConfig-战斗参数-新增')
          return
        }
        message.success('已新增')
      }
      setModalOpen(false)
      setEditing(null)
      await loadRows()
    } catch (error) {
      handleApiError(error, 'JourneyConfig-战斗参数-保存')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async (row: ParamRow) => {
    if (!row.record || !canDelete) return
    const res = await journeyBattleParamService.delete(row.record.id)
    if (!res.success) {
      handleApiError(res.errorMessage, 'JourneyConfig-战斗参数-重置')
      return
    }
    message.success(`已重置「${row.label}」，回落默认值 ${row.def.default}`)
    await loadRows()
  }

  const addOptions = (group?.params ?? [])
    .filter((p) => !byCode[p.code] || p.code === editing?.code)
    .map((p) => ({ value: p.code, label: p.label }))

  const columns: ColumnsType<ParamRow> = [
    {
      title: '参数',
      dataIndex: 'label',
      key: 'label',
      width: 220,
      render: (v: string, r) => (
        <Space size={4}>
          <Text>{v}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.code}</Text>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'kind',
      key: 'kind',
      width: 90,
      render: (_: unknown, r) => {
        const label = { number: '数值', percent: '比例', duration: '时长', integer: '整数' }[r.def.kind]
        return <Tag>{label}</Tag>
      },
    },
    {
      title: '当前值',
      dataIndex: 'value',
      key: 'value',
      width: 130,
      render: (_: unknown, r) =>
        r.value === null ? (
          <Text type="secondary">未配置（默认 {r.def.default}）</Text>
        ) : (
          <Space size={4}>
            <Text strong>{r.value}</Text>
            {!r.enabled && <Tag color="default">停用</Tag>}
          </Space>
        ),
    },
    {
      title: '默认值',
      dataIndex: 'default',
      key: 'default',
      width: 90,
      render: (_: unknown, r) => <Text type="secondary">{r.def.default}</Text>,
    },
    {
      title: '说明',
      dataIndex: 'hint',
      key: 'hint',
      ellipsis: true,
      render: (_: unknown, r) => r.def.hint ?? '-',
    },
    getActionColumn<ParamRow>((row) => [
      {
        key: 'edit',
        label: row.record ? '编辑' : '配置',
        icon: <EditOutlined />,
        disabled: !canWrite,
        onClick: () => openEdit(row),
      },
      {
        key: 'reset',
        label: '重置',
        icon: <DeleteOutlined />,
        danger: true,
        disabled: !canDelete || !row.record,
        confirm: '确认重置为默认？',
        onClick: () => handleReset(row),
      },
    ], { width: 150 }),
  ]

  const selectedDef = group?.params.find((p) => p.code === selectedCode)

  return (
    <div>
      <Alert
        type="info"
        showIcon
        className={common.mb16}
        message={group?.label ?? '战斗参数'}
        description={group?.intro}
      />
      <Card size="small" className={common.mb16}>
        <div className={common.toolbar}>
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={loadRows} loading={loading}>刷新</Button>
            <Text type="secondary">
              已配置 {rows.length} / {group?.params.length ?? 0} 项 · 未配置项回落 App 默认值
            </Text>
          </Space>
          <Button type="primary" icon={<PlusOutlined />} disabled={!canWrite} onClick={openAdd}>
            配置参数
          </Button>
        </div>
      </Card>
      <Table
        rowKey="key"
        size="small"
        tableLayout="fixed"
        columns={columns}
        dataSource={paramRows}
        loading={loading}
        pagination={false}
        scroll={{ y: 520 }}
      />
      <Modal
        title={`${editing ? '编辑' : '配置'} · ${selectedDef?.label ?? '参数'}`}
        open={modalOpen}
        onOk={handleSave}
        confirmLoading={saving}
        onCancel={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        destroyOnHidden
        width={480}
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item label="参数" required>
            <Select
              showSearch
              optionFilterProp="label"
              value={selectedCode}
              onChange={setSelectedCode}
              disabled={!!editing}
              options={addOptions}
              placeholder="选择参数"
            />
          </Form.Item>
          <Form.Item name="value" label={`数值${selectedDef ? `（默认 ${selectedDef.default}）` : ''}`}>
            <InputNumber
              className={common.fullWidth}
              min={selectedDef?.min}
              max={selectedDef?.max}
              step={selectedDef?.step}
            />
          </Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="可选：改动原因/口径说明" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default JourneyBattleParamsTab
