import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Card,
  Button,
  Form,
  Modal,
  Spin,
  Table,
  message,
} from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { usePermission } from '../../hooks/usePermission'
import { petConfigService, petItemService } from '../../services/petService'
import type { PetConfigRow } from '../../types/pet'
import { MODULES } from './constants'
import {
  ROW_COLUMNS,
  buildFieldRows,
  buildNewbieRows,
  buildTierRows,
  buildValueColumns,
} from './columns'
import { renderModuleControls } from './ModuleControls'
import type { ItemOption, ModuleKey } from './types'
import common from '../../styles/common.module.css'

// ==================== 宠物全局参数（pet_config 单行表） ====================
//
// 交互形态（2026-09-17 调整）：每模块一张参数表（参数 / 当前值 / 说明），整卡只读；
// 仅模块卡片右上角「编辑」进入弹窗表单修改（取消表格行点击），保存只提交本模块字段
// （PATCH 语义，互不干扰、失败可单独重试）。
// 回显：Form 挂 initialValues + Modal destroyOnHidden——每次打开重新挂载即回显，
// 不再依赖 setFieldsValue 时序（Modal 内容异步挂载会丢值）。
// 历险/任务拆分为两张卡片；历险档位按 adventure_tiers 逐档成行；初始资源包按内容拆行。
//
// 文件拆分（2026-09-22，审查 P2-16 单文件超 500 行）：
//   types.ts           —— ModuleKey / FieldMeta / ModuleMeta / ValueRow / ItemOption
//   constants.tsx      —— MODULES 九张卡的字段元数据与格式化器
//   columns.tsx        —— 只读展示列 + 档位/初始包拆行纯函数
//   ModuleControls.tsx —— 弹窗表单控件（与 RPC 消费结构同源）
//   index.tsx          —— 状态装载、PATCH 保存、卡片与弹窗编排

const PetConfig: React.FC = () => {
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('pets:write')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [row, setRow] = useState<PetConfigRow | null>(null)
  const [itemOptions, setItemOptions] = useState<ItemOption[]>([])
  const [editModule, setEditModule] = useState<ModuleKey | null>(null)
  const [editForm] = Form.useForm()

  const loadConfig = useCallback(async () => {
    setLoading(true)
    const res = await petConfigService.loadConfig()
    if (res.success && res.data) setRow(res.data)
    setLoading(false)
  }, [])

  const loadItems = useCallback(async () => {
    const res = await petItemService.findAll()
    if (res.success && res.data) {
      setItemOptions(
        res.data.map((i) => ({ item_code: i.item_code, name: i.name, category: i.category }))
      )
    }
  }, [])

  useEffect(() => {
    loadConfig()
    loadItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openEdit = (key: ModuleKey) => {
    if (!row) return
    setEditModule(key)
  }

  // 弹窗保存：只校验并提交本模块字段
  const handleSave = async () => {
    if (!row || !editModule) return
    const mod = MODULES.find((m) => m.key === editModule)
    if (!mod) return
    const fields = mod.fields.map((f) => f.field)
    const values = await editForm.validateFields(fields)
    if (editModule === 'economy') {
      const pairs: Array<[string, number, number]> = [
        ['背包', values.backpack_capacity_init, values.backpack_capacity_max],
        ['养育格', values.rearing_capacity_init, values.rearing_capacity_max],
        ['寄养格', values.foster_capacity_init, values.foster_capacity_max],
      ]
      for (const [label, init, max] of pairs) {
        if (init > max) return void message.error(`${label}初始容量不能大于上限`)
      }
    }
    setSaving(true)
    try {
      const res = await petConfigService.update(row.id, values as never)
      if (!res.success) return
      message.success(`「${mod.title}」已保存`)
      setEditModule(null)
      // 局部刷新：仅合并本模块字段到本地行，不整页重拉（其他模块不闪动、不受影响）
      setRow((prev) => (prev ? { ...prev, ...(values as Partial<PetConfigRow>) } : prev))
    } finally {
      setSaving(false)
    }
  }

  // ---------- 拆行展示（历险档位逐档 / 初始资源包按内容） ----------
  const tierRows = useMemo(() => buildTierRows(row), [row])

  /** item_code → 展示名：初始包拆行与道具目录同源 */
  const itemName = useCallback(
    (code: unknown) => {
      const c = code != null ? String(code) : ''
      const found = itemOptions.find((i) => i.item_code === c)
      return found ? `${found.name}（${c}）` : c || '—'
    },
    [itemOptions]
  )

  const newbieRows = useMemo(() => buildNewbieRows(row, itemName), [row, itemName])

  const valueColumns = useMemo(() => buildValueColumns(row), [row])

  if (loading)
    return (
      <div className={common.mt16} style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    )
  if (!row) {
    return (
      <Alert
        type="warning"
        showIcon
        message="未找到全局参数行（pet_config id=1）"
        description="请确认宠物系统建表与种子 SQL 已执行（种子应插入 id=1 的默认参数行）。"
      />
    )
  }

  const editMod = MODULES.find((m) => m.key === editModule)

  return (
    <div>
      <Alert
        type="info"
        showIcon
        className={common.mb16}
        message="全局参数说明"
        description="按模块查看参数表，点击模块卡片右上角「编辑」打开弹窗修改；保存只提交本模块字段。概率/审计版本锚点 config_version 只读（递增在蛋池页操作）。"
      />
      {MODULES.map((mod) => (
        <Card
          key={mod.key}
          title={mod.title}
          className={common.mb16}
          extra={
            <Button
              size="small"
              icon={<EditOutlined />}
              disabled={!canWrite}
              onClick={() => openEdit(mod.key)}
            >
              编辑
            </Button>
          }
        >
          {mod.key === 'adventure' ? (
            <>
              <Table
                rowKey="key"
                size="small"
                columns={ROW_COLUMNS}
                dataSource={tierRows}
                pagination={false}
              />
              <Table
                rowKey="key"
                size="small"
                className={common.mt16}
                columns={ROW_COLUMNS}
                dataSource={buildFieldRows(row, mod)}
                pagination={false}
              />
            </>
          ) : mod.key === 'newbie' ? (
            <Table
              rowKey="key"
              size="small"
              columns={ROW_COLUMNS}
              dataSource={newbieRows}
              pagination={false}
            />
          ) : (
            <Table
              rowKey="field"
              size="small"
              columns={valueColumns}
              dataSource={mod.fields}
              pagination={false}
            />
          )}
        </Card>
      ))}

      <Card title="审计锚点" className={common.mb16}>
        <Table
          rowKey="field"
          size="small"
          columns={[
            { title: '参数', dataIndex: 'label', width: 260 },
            {
              title: '当前值',
              dataIndex: 'field',
              render: () => `v${row.config_version}`,
            },
            {
              title: '说明',
              dataIndex: 'desc',
              render: () => 'config_version 在「蛋池与概率」修改概率时递增，App 公示与 RPC 判定同源锚点',
            },
          ]}
          dataSource={[{ field: 'config_version', label: 'config_version（概率/审计版本）' }]}
          pagination={false}
        />
      </Card>

      <Modal
        title={`编辑 · ${editMod?.title ?? ''}`}
        open={editModule !== null}
        onOk={handleSave}
        confirmLoading={saving}
        onCancel={() => setEditModule(null)}
        destroyOnHidden
        width={620}
      >
        {/* 回显方案：destroyOnHidden 每次打开重新挂载 → initialValues 挂载即生效，
            规避「Modal 内容异步挂载导致 setFieldsValue 丢值」问题 */}
        <Form
          form={editForm}
          layout="vertical"
          preserve={false}
          initialValues={(row ?? {}) as unknown as Record<string, unknown>}
        >
          {editModule ? renderModuleControls(editModule, { canWrite, itemOptions }) : null}
        </Form>
      </Modal>
    </div>
  )
}

export default PetConfig
