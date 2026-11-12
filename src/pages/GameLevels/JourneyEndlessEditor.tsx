import { useCallback, useEffect, useState } from 'react'
import { Table, Button, Select, InputNumber, Tag, Typography, Alert, Space, Modal, message } from 'antd'
import { ReloadOutlined, SettingOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { buildEndlessRebuildRows } from '../../utils/journeyExpPool'
import type { ColumnsType } from 'antd/es/table'
import { handleApiError } from '../../utils/apiClient'
import { journeyEndlessWaveService, journeyMonsterService } from '../../services/gameService'
import { usePermission } from '../../hooks/usePermission'
import { useMounted } from '../../hooks/useMounted'

const { Text } = Typography

interface MonsterRow {
  code: string
  name: string
  ai_tier: string | null
}

interface EndlessWaveRow {
  id: string
  wave_no: number
  monster_code: string | null
  count: number | null
  buff_mult: number | null
  elite_count: number
}

/// 无尽妖潮 · 模式关卡编辑器（GameLevels 模式切到「无尽妖潮」时整页展示）：
/// 99 波推演数据分页表格（每页 10 波），每波「配置」打开独立弹窗表单——
/// 总量/末尾精英数/增强倍数可调（精英 0=公式兜底）；怪种留空=分阶随机
/// 小妖，选妖王=首只妖王 + 小怪护卫。另提供「按经验池重算 99 波」批量
/// 生成，避免逐波手工填写。
const JourneyEndlessEditor: React.FC = () => {
  const mountedRef = useMounted()
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('games:write')

  const [waves, setWaves] = useState<EndlessWaveRow[]>([])
  const [monsters, setMonsters] = useState<MonsterRow[]>([])
  const [loading, setLoading] = useState(false)
  const [editRow, setEditRow] = useState<EndlessWaveRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [rebuilding, setRebuilding] = useState(false)
  const [draft, setDraft] = useState<{
    monster_code: string | null
    count: number
    buff_mult: number
    elite_count: number
  } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await journeyEndlessWaveService.findAll()
      if (!mountedRef.current) return
      if (!res.success) {
        handleApiError(res.errorMessage, 'JourneyEndlessEditor-加载')
        return
      }
      const rows = [...(res.data ?? [])] as EndlessWaveRow[]
      rows.sort((a, b) => a.wave_no - b.wave_no)
      setWaves(rows)
    } catch (error) {
      handleApiError(error, 'JourneyEndlessEditor-加载')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [mountedRef])

  useEffect(() => {
    load()
    journeyMonsterService.findAll().then((res) => {
      if (!mountedRef.current || !res.success) return
      setMonsters((res.data ?? []) as MonsterRow[])
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const monsterOptions = (() => {
    const boss = monsters.filter((m) => m.ai_tier === 'boss')
    const mob = monsters.filter((m) => m.ai_tier !== 'boss')
    const opt = (m: MonsterRow) => ({ value: m.code, label: `${m.name}（${m.code}）` })
    return [
      ...(boss.length ? [{ key: 'boss', label: '妖王（任意波可选）', options: boss.map(opt) }] : []),
      { key: 'mob', label: '普通怪物 / 精英', options: mob.map(opt) },
    ]
  })()

  const monsterName = (code: string | null) =>
    code ? (monsters.find((m) => m.code === code)?.name ?? code) : null

  const isBoss = (code: string | null) =>
    monsters.find((m) => m.code === code)?.ai_tier === 'boss'

  const openEdit = (row: EndlessWaveRow) => {
    setEditRow(row)
    setDraft({
      monster_code: row.monster_code,
      count: row.count ?? 10,
      buff_mult: row.buff_mult ?? 1,
      elite_count: row.elite_count ?? 0,
    })
  }

  const saveEdit = async () => {
    if (!editRow || !draft || saving) return
    setSaving(true)
    try {
      const res = await journeyEndlessWaveService.update(editRow.id, {
        monster_code: draft.monster_code,
        count: draft.count,
        buff_mult: draft.buff_mult,
        elite_count: draft.elite_count,
      })
      if (!res.success) {
        handleApiError(res.errorMessage, 'JourneyEndlessEditor-保存')
        return
      }
      setEditRow(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  const rebuildByExpPool = () => {
    Modal.confirm({
      title: '按经验池重算 99 波？',
      content:
        '每波总量改为 50~120 只、末尾精英 2~14 只、增强倍率改为 1+0.03×波号；妖王波怪种保留。原数值会被覆盖，重算后可逐波微调。',
      okText: '确认重算',
      cancelText: '取消',
      onOk: async () => {
        setRebuilding(true)
        try {
          const res = await journeyEndlessWaveService.rebuildByExpPool(buildEndlessRebuildRows())
          if (!res.success) {
            handleApiError(res.errorMessage, 'JourneyEndlessEditor-重算')
            return
          }
          message.success('99 波已按经验池重算')
          await load()
        } finally {
          setRebuilding(false)
        }
      },
    })
  }

  const bossCount = waves.filter((w) => isBoss(w.monster_code)).length

  const columns: ColumnsType<EndlessWaveRow> = [
    {
      title: '波次',
      dataIndex: 'wave_no',
      key: 'wave_no',
      width: 90,
      render: (v: number) => <Text strong>第 {v} 波</Text>,
    },
    {
      title: '怪种',
      dataIndex: 'monster_code',
      key: 'monster_code',
      render: (v: string | null) =>
        v ? (
          <Space>
            {isBoss(v) && <Tag color="red">妖王</Tag>}
            {monsterName(v)}
          </Space>
        ) : (
          <Text type="secondary">内置曲线随机</Text>
        ),
    },
    { title: '数量', dataIndex: 'count', key: 'count', width: 80 },
    {
      title: '末尾精英',
      dataIndex: 'elite_count',
      key: 'elite_count',
      width: 100,
      render: (v: number | null) => (v ? `${v} 只` : '公式兜底'),
    },
    {
      title: '增强倍数',
      dataIndex: 'buff_mult',
      key: 'buff_mult',
      width: 110,
      render: (v: number) => (v != null ? `×${v}` : '-'),
    },
    {
      title: '操作',
      key: 'act',
      width: 110,
      render: (_: unknown, r) => (
        <Button
          size="small"
          icon={<SettingOutlined />}
          disabled={!canWrite}
          onClick={() => openEdit(r)}
        >
          配置
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Alert
        type="info"
        showIcon
        className="mb16"
        message="每波按「先小妖发育、末尾精英施压」分段刷怪：波内普通怪由怪种配置（留空=分阶随机池），末尾精英数由「末尾精英」指定（0=引擎按波号公式兜底）。选妖王的波次=首只妖王 + 小怪护卫。第 99 波清空即终局结算。"
      />
      <Space wrap className="mb16">
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
          刷新
        </Button>
        <Button
          icon={<ThunderboltOutlined />}
          disabled={!canWrite}
          loading={rebuilding}
          onClick={rebuildByExpPool}
        >
          按经验池重算 99 波
        </Button>
        <Text type="secondary">
          共 {waves.length} / 99 波 · 妖王波 {bossCount} 波（9/19/…/99 默认妖王，可自由调整）
        </Text>
      </Space>

      <Table
        columns={columns}
        dataSource={waves}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        size="small"
      />

      <Modal
        title={`第 ${editRow?.wave_no ?? '-'} 波 · 波次配置`}
        open={editRow !== null}
        onCancel={() => setEditRow(null)}
        onOk={saveEdit}
        confirmLoading={saving}
        okButtonProps={{ disabled: !canWrite }}
        width={520}
        destroyOnClose
      >
        {draft && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <Text>怪种（普通段刷该怪；留空=分阶随机池；选妖王=首只妖王+护卫）：</Text>
              <Select
                className="w-full"
                style={{ marginTop: 4 }}
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="留空=内置曲线随机"
                value={draft.monster_code ?? undefined}
                disabled={!canWrite}
                options={monsterOptions}
                onChange={(v) => setDraft({ ...draft, monster_code: v ?? null })}
              />
            </div>
            <div>
              <Text>本波总量（建议 50~120）：</Text>
              <InputNumber
                className="w-full"
                style={{ marginTop: 4 }}
                min={1}
                max={200}
                value={draft.count}
                disabled={!canWrite}
                onChange={(v) => v != null && setDraft({ ...draft, count: v })}
              />
            </div>
            <div>
              <Text>末尾精英只数（0=引擎按波号公式兜底）：</Text>
              <InputNumber
                className="w-full"
                style={{ marginTop: 4 }}
                min={0}
                max={50}
                value={draft.elite_count}
                disabled={!canWrite}
                onChange={(v) => v != null && setDraft({ ...draft, elite_count: v })}
              />
            </div>
            <div>
              <Text>增强倍数：</Text>
              <InputNumber
                className="w-full"
                style={{ marginTop: 4 }}
                min={0.1}
                max={99}
                step={0.1}
                value={draft.buff_mult}
                disabled={!canWrite}
                onChange={(v) => v != null && setDraft({ ...draft, buff_mult: v })}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default JourneyEndlessEditor
