import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Form,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { handleApiError } from '../../utils/apiClient'
import { useMounted } from '../../hooks/useMounted'
import { usePagination } from '../../hooks/usePagination'
import { usePermission } from '../../hooks/usePermission'
import {
  journeyLevelService,
  journeyMonsterService,
  journeyRegionService,
} from '../../services/gameService'
import { JOURNEY_LEVEL_KIND_MAP } from '../../constants/game'
import type { JourneyLookups } from './journeyTabSchema'
import common from '../../styles/common.module.css'

const { Text } = Typography

/// 关卡属性行：西行子表 journey_levels 以 game_levels.id 为 level_id。
interface LevelAttrRow {
  level_id: string
  levelLabel: string
  region_code: string | null
  level_kind: string | null
  boss_code: string | null
  boss_fights: number
  first_clear_merit: number
  duration_target_sec: number | null
}

const LEVEL_KIND_OPTIONS = Object.entries(JOURNEY_LEVEL_KIND_MAP).map(
  ([value, info]) => ({ value, label: info.label }),
)

/// 西行关卡属性：本关妖王覆盖本段妖王，清空写 null 回落；关卡主体仍在关卡配置页。
const JourneyLevelAttrsTab: React.FC<{ lookups: JourneyLookups }> = ({ lookups }) => {
  const mountedRef = useMounted()
  const { hasPermission } = usePermission()
  const canWrite = hasPermission('games:write')
  const pager = usePagination()
  const [form] = Form.useForm()
  const [rows, setRows] = useState<LevelAttrRow[]>([])
  const [regions, setRegions] = useState<{ value: string; label: string }[]>([])
  const [bosses, setBosses] = useState<{ value: string; label: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<LevelAttrRow | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [attrsRes, regionsRes, monstersRes] = await Promise.all([
        journeyLevelService.findAll(),
        journeyRegionService.findAll(),
        journeyMonsterService.findAll(),
      ])
      if (!attrsRes.success || !regionsRes.success || !monstersRes.success) {
        handleApiError(
          attrsRes.errorMessage ?? regionsRes.errorMessage ?? monstersRes.errorMessage ?? '加载失败',
          'JourneyLevelAttrs-加载',
        )
        return
      }
      if (!mountedRef.current) return
      setRegions((regionsRes.data ?? []).map((r) => ({ value: r.code, label: r.name })))
      setBosses(
        (monstersRes.data ?? [])
          .filter((m) => m.ai_tier === 'boss')
          .map((m) => ({ value: m.code, label: `${m.name}（${m.code}）` })),
      )
      const attrMap = new Map((attrsRes.data ?? []).map((a) => [a.level_id, a]))
      setRows(
        lookups.levels.map((level) => {
          const attr = attrMap.get(level.value)
          return {
            level_id: level.value,
            levelLabel: level.label,
            region_code: attr?.region_code ?? null,
            level_kind: attr?.level_kind ?? null,
            boss_code: attr?.boss_code ?? null,
            boss_fights: attr?.boss_fights ?? 0,
            first_clear_merit: attr?.first_clear_merit ?? 0,
            duration_target_sec: attr?.duration_target_sec ?? null,
          }
        }),
      )
      pager.setTotal(lookups.levels.length)
    } catch (error) {
      handleApiError(error, 'JourneyLevelAttrs-加载')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookups.levels, mountedRef])

  useEffect(() => { load() }, [load])

  const columns = useMemo<ColumnsType<LevelAttrRow>>(() => [
    { title: '关卡', dataIndex: 'levelLabel', key: 'levelLabel', width: 180 },
    {
      title: '区域',
      dataIndex: 'region_code',
      key: 'region_code',
      width: 110,
      render: (v: string | null) => {
        if (!v) return <Text type="secondary">未配置</Text>
        return <Tag color="blue">{regions.find((r) => r.value === v)?.label ?? v}</Tag>
      },
    },
    {
      title: '难别',
      dataIndex: 'level_kind',
      key: 'level_kind',
      width: 100,
      render: (v: string | null) => {
        if (!v) return <Text type="secondary">未配置</Text>
        const info = JOURNEY_LEVEL_KIND_MAP[v] ?? { color: 'default', label: v }
        return <Tag color={info.color}>{info.label}</Tag>
      },
    },
    {
      title: '本关妖王',
      dataIndex: 'boss_code',
      key: 'boss_code',
      width: 150,
      render: (v: string | null) => {
        if (!v) return <Text type="secondary">本段妖王</Text>
        return <Tag color="red">{bosses.find((b) => b.value === v)?.label ?? v}</Tag>
      },
    },
    { title: '妖王战', dataIndex: 'boss_fights', key: 'boss_fights', width: 80 },
    { title: '首通功德', dataIndex: 'first_clear_merit', key: 'first_clear_merit', width: 100 },
    {
      title: '坚持时长',
      dataIndex: 'duration_target_sec',
      key: 'duration_target_sec',
      width: 100,
      render: (v: number | null) => (v === null ? <Text type="secondary">默认 300s</Text> : `${v}s`),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, record: LevelAttrRow) => (
        <Button
          size="small"
          disabled={!canWrite}
          onClick={() => {
            setEditing(record)
            setModalOpen(true)
          }}
        >
          编辑
        </Button>
      ),
    },
  ], [bosses, canWrite, regions])

  const openEdit = (row: LevelAttrRow) => {
    setEditing(row)
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!editing || saving) return
    let values: Record<string, any>
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    setSaving(true)
    try {
      const res = await journeyLevelService.saveByLevel(editing.level_id, {
        region_code: values.region_code,
        level_kind: values.level_kind,
        boss_code: values.boss_code || null,
        boss_fights: values.boss_fights ?? 0,
        first_clear_merit: values.first_clear_merit ?? 0,
        duration_target_sec: values.duration_target_sec ?? null,
      })
      if (!res.success) {
        handleApiError(res.errorMessage, 'JourneyLevelAttrs-保存')
        return
      }
      message.success('关卡属性已保存')
      setModalOpen(false)
      setEditing(null)
      form.resetFields()
      load()
    } catch (error) {
      handleApiError(error, 'JourneyLevelAttrs-保存')
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
        message="关卡主体仍在「关卡配置」页；这里只管西行关卡子表属性"
        description="本关妖王留空即沿用所属区域配置的本段妖王；车迟国三关在此分别指定虎力/鹿力/羊力。波次、热区、参照物在「关卡细节」按关卡编辑。"
      />
      <Card>
        <div className={common.toolbar}>
          <Space wrap>
            <Button onClick={load} loading={loading}>刷新</Button>
            <Text type="secondary">共 {rows.length} 关</Text>
          </Space>
        </div>
        <Table
          rowKey="level_id"
          columns={columns}
          dataSource={rows}
          loading={loading}
          pagination={{ ...pager.tablePagination, showSizeChanger: false, pageSize: 10 }}
          scroll={{ x: 1000 }}
          size="small"
          onRow={(record) => ({ onDoubleClick: () => openEdit(record) })}
        />
      </Card>
      <Modal
        title={editing ? `关卡属性 · ${editing.levelLabel}` : '关卡属性'}
        open={modalOpen}
        onOk={handleSave}
        confirmLoading={saving}
        okButtonProps={{ disabled: !canWrite }}
        afterOpenChange={(open) => {
          if (!open || !editing) return
          form.resetFields()
          form.setFieldsValue({
            region_code: editing.region_code ?? undefined,
            level_kind: editing.level_kind ?? undefined,
            boss_code: editing.boss_code ?? undefined,
            boss_fights: editing.boss_fights ?? 0,
            first_clear_merit: editing.first_clear_merit ?? 0,
            duration_target_sec: editing.duration_target_sec ?? undefined,
          })
        }}
        onCancel={() => {
          setModalOpen(false)
          setEditing(null)
          form.resetFields()
        }}
        width={560}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="region_code" label="所属区域" rules={[{ required: true, message: '请选择区域' }]}>
            <Select showSearch optionFilterProp="label" options={regions} placeholder="选择区域" />
          </Form.Item>
          <Form.Item name="level_kind" label="难别" rules={[{ required: true, message: '请选择难别' }]}>
            <Select showSearch optionFilterProp="label" options={LEVEL_KIND_OPTIONS} placeholder="选择难别" />
          </Form.Item>
          <Form.Item name="boss_code" label="本关妖王" tooltip="留空=沿用本段妖王">
            <Select
              showSearch
              allowClear
              optionFilterProp="label"
              options={bosses}
              placeholder="留空=本段妖王"
            />
          </Form.Item>
          <Form.Item name="boss_fights" label="妖王战数">
            <InputNumber className={common.fullWidth} min={0} max={9} />
          </Form.Item>
          <Form.Item name="first_clear_merit" label="首通功德">
            <InputNumber className={common.fullWidth} min={0} />
          </Form.Item>
          <Form.Item name="duration_target_sec" label="坚持通关时长(秒)" tooltip="留空=默认 300 秒；妖王难不消费此值">
            <InputNumber className={common.fullWidth} min={0} placeholder="默认 300" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default JourneyLevelAttrsTab
