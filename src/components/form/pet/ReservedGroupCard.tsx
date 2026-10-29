import React, { useCallback, useEffect, useState } from 'react'
import { Button, Card, Form, InputNumber, message, Modal, Table, Typography } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { petConfigService } from '../../../services/petService'

// ==================== 玩法参数卡（reserved 组就近维护） ====================
//
// 交互形态与「全局参数」页一致：页面只读展示参数表，
// 卡片右上角「编辑」打开弹窗表单修改，保存只提交本卡字段。
// 回显采用确定性方案：Modal destroyOnHidden 每次打开重新挂载，Form 挂
// initialValues（由 reserved 深取值构建）即回显，不依赖 setFieldsValue 时序。
// 数据链：loadConfig 读 reserved → 弹窗编辑 → 按各字段 path 构建嵌套 patch →
// deepMergeReserved 整组合并提交（未涉及键原样保留）。

export interface ReservedField {
  /** reserved 下的完整键路径段，如 ['lottery','ssr_pity_at'] */
  path: string[]
  label: string
  /** 只读表格与弹窗中的说明 */
  desc?: string
  tooltip?: string
  min?: number
  max?: number
  step?: number
  addonAfter?: string
}

export interface ReservedGroup {
  title: string
  description?: string
  fields: ReservedField[]
}

interface Props {
  groups: ReservedGroup[]
  canWrite: boolean
}

const deepGet = (obj: unknown, path: string[]): unknown => {
  let cur: unknown = obj
  for (const seg of path) {
    if (cur === null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[seg]
  }
  return cur
}

const deepSet = (
  obj: Record<string, unknown>,
  path: string[],
  v: unknown,
): Record<string, unknown> => {
  const head = path[0]
  if (head === undefined) return obj
  const next: Record<string, unknown> = { ...obj }
  if (path.length === 1) {
    if (v === null || v === undefined) delete next[head]
    else next[head] = v
    return next
  }
  const child =
    next[head] !== null && typeof next[head] === 'object'
      ? (next[head] as Record<string, unknown>)
      : {}
  next[head] = deepSet(child, path.slice(1), v)
  return next
}

/** 深合并：patch 覆盖既有 reserved，未涉及键（运营手写/其他卡维护）原样保留 */
export const deepMergeReserved = (
  base: unknown,
  patch: Record<string, unknown>,
): Record<string, unknown> => {
  const out: Record<string, unknown> =
    base && typeof base === 'object' ? { ...(base as Record<string, unknown>) } : {}
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue
    out[k] =
      v !== null && typeof v === 'object' && !Array.isArray(v)
        ? deepMergeReserved(out[k], v as Record<string, unknown>)
        : v
  }
  return out
}

const fmtValue = (v: unknown): string =>
  typeof v === 'number' ? String(v) : v === undefined || v === null ? '—' : String(v)

// ---------- 单组卡片：只读参数表 + 编辑弹窗 ----------
const GroupCard: React.FC<{
  group: ReservedGroup
  reserved: Record<string, unknown>
  rowId: number | null
  canWrite: boolean
  onSaved: (merged: Record<string, unknown>) => void
}> = ({ group, reserved, rowId, canWrite, onSaved }) => {
  const [form] = Form.useForm()
  const [editOpen, setEditOpen] = useState(false)
  const [openSeq, setOpenSeq] = useState(0)
  const [saving, setSaving] = useState(false)

  // 弹窗表单用相对路径（剥 'reserved' 首段，路径语义 = reserved 内层键），
  // initialValues 按同一相对路径构建；destroyOnHidden 每次打开重挂载即确定性回显
  const relPath = (f: ReservedField): string[] =>
    f.path[0] === 'reserved' ? f.path.slice(1) : f.path
  const initial: Record<string, unknown> = {}
  for (const f of group.fields) {
    const val = deepGet(reserved, relPath(f))
    if (val !== undefined) deepSet(initial, relPath(f), val)
  }

  const handleOk = async () => {
    const values = await form.validateFields()
    const merged = deepMergeReserved(reserved, values as Record<string, unknown>)
    if (!rowId) return
    setSaving(true)
    try {
      const res = await petConfigService.update(rowId, { reserved: merged } as never)
      if (!res.success) return
      message.success(`「${group.title}」已保存`)
      onSaved(merged)
      setEditOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card
      size="small"
      title={group.title}
      extra={
        canWrite && (
          <Button
            size="small"
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              setOpenSeq((s) => s + 1)
              setEditOpen(true)
            }}
          >
            编辑
          </Button>
        )
      }
    >
      {group.description && (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 8, fontSize: 12 }}>
          {group.description}
        </Typography.Paragraph>
      )}
      <Table
        size="small"
        pagination={false}
        rowKey={(r) => r.label}
        columns={[
          { title: '参数', dataIndex: 'label', width: 200 },
          { title: '当前值', dataIndex: 'value', width: 120 },
          { title: '说明', dataIndex: 'desc', ellipsis: true },
        ]}
        dataSource={group.fields.map((f) => ({
          label: f.label,
          value: fmtValue(deepGet(reserved, relPath(f))),
          desc: f.desc ?? '',
        }))}
      />
      {!canWrite && (
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
          只读（无 pets:write 权限）
        </Typography.Text>
      )}
      <Modal
        key={openSeq}
        title={`编辑 · ${group.title}`}
        open={editOpen}
        onOk={handleOk}
        confirmLoading={saving}
        onCancel={() => setEditOpen(false)}
        destroyOnHidden
        width={520}
      >
        <Form form={form} layout="vertical" preserve={false} initialValues={initial}>
          {group.fields.map((f) => (
            <Form.Item
              key={f.path.join('.')}
              name={relPath(f)}
              label={f.label}
              tooltip={f.tooltip}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={f.min}
                max={f.max}
                step={f.step}
                addonAfter={f.addonAfter}
                disabled={!canWrite}
              />
            </Form.Item>
          ))}
        </Form>
      </Modal>
    </Card>
  )
}

const ReservedGroupCard: React.FC<Props> = ({ groups, canWrite }) => {
  const [reserved, setReserved] = useState<Record<string, unknown>>({})
  const [rowId, setRowId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await petConfigService.loadConfig()
    if (res.success && res.data) {
      setRowId(res.data.id)
      const r = res.data.reserved
      setReserved(r && !Array.isArray(r) && typeof r === 'object' ? (r as Record<string, unknown>) : {})
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <Card loading />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {groups.map((group) => (
        <GroupCard
          key={group.title}
          group={group}
          reserved={reserved}
          rowId={rowId}
          canWrite={canWrite}
          onSaved={(merged) => setReserved(merged)}
        />
      ))}
    </div>
  )
}

export default ReservedGroupCard
