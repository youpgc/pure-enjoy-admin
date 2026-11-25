import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Drawer, InputNumber, Space, Tag, Typography, message } from 'antd'
import { handleApiError } from '../../utils/apiClient'
import { journeyMonsterParamService } from '../../services/journeyConfigService'
import { JOURNEY_BOSS_ABILITY_MAP, JOURNEY_MONSTER_PARAM_KEY_MAP } from '../../constants/game'
import { JOURNEY_BOSS_ABILITY_PARAMS } from '../../constants/journeyBossAbilities'
import common from '../../styles/common.module.css'
import styles from './index.module.css'
import type { DbJourneyMonsterParam } from '../../types/database'
import type { BossAbilityRow } from './columns'

const { Text } = Typography

/// 参数编辑行：一行一个参数键，value 为 null 表示留空（保存时回落缺省/删行）。
interface ParamEditRow {
  code: string
  label: string
  value: number | null
  defaultValue: number
  /// 云端已存在该行（id 非空）→ 保存时 update；否则 create
  rowId: string | null
  /// 每行归属的能力（多能力共享键时并列展示）
  ownerAbilities: string[]
}

interface Props {
  open: boolean
  row: BossAbilityRow | null
  /// 该妖王的全部参数行（云端原始，用于回填与整包保存）
  paramRows: DbJourneyMonsterParam[]
  onClose: () => void
  onSaved: () => void
}

const AbilityParamDrawer: React.FC<Props> = ({ open, row, paramRows, onClose, onSaved }) => {
  const [editing, setEditing] = useState<Record<string, number | null>>({})
  const [saving, setSaving] = useState(false)

  /// 该能力应配的键（来自 App 权威映射），按中文名排序，缺省值取自映射。
  const keys = useMemo(() => {
    if (!row) return []
    const mapping = JOURNEY_BOSS_ABILITY_PARAMS[row.abilityKey]
    if (!mapping) return []
    return [...mapping.keys].sort((a, b) => {
      const la = JOURNEY_MONSTER_PARAM_KEY_MAP[a]?.label ?? a
      const lb = JOURNEY_MONSTER_PARAM_KEY_MAP[b]?.label ?? b
      return la.localeCompare(lb, 'zh-CN')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.abilityKey])

  /// 初始化编辑值：云端有行取 value_num，无行留空。
  useEffect(() => {
    if (!row || !open) return
    const byCode = new Map(paramRows.map((p) => [p.code, p]))
    const next: Record<string, number | null> = {}
    for (const key of keys) {
      const hit = byCode.get(key)
      next[key] = hit ? hit.value_num : null
    }
    setEditing(next)
  }, [row, open, keys, paramRows])

  /// 保存整包：有值行一次 upsert（有则改、无则增），留空行一次删除。
  /// 批量提交避免逐键写入中途失败造成部分生效。
  const handleSave = async () => {
    if (!row) return
    setSaving(true)
    try {
      const byCode = new Map(paramRows.map((p) => [p.code, p]))
      const upserts: { monster_id: string; code: string; value_num: number }[] = []
      const deleteIds: string[] = []
      for (const key of keys) {
        const value = editing[key] ?? null
        const existing = byCode.get(key)
        if (value === null || value === undefined) {
          // 留空=回落 App 内置缺省：云端若有行则删除，无行跳过
          if (existing) deleteIds.push(existing.id)
          continue
        }
        if (!existing || existing.value_num !== value) {
          upserts.push({ monster_id: row.monsterId, code: key, value_num: value })
        }
      }
      const res = await journeyMonsterParamService.saveBundle(upserts, deleteIds)
      if (!res.success) {
        handleApiError(res.errorMessage, '妖王能力-整包保存')
        return
      }
      message.success('该能力参数已保存')
      onSaved()
      onClose()
    } catch (error) {
      handleApiError(error, '妖王能力-整包保存')
    } finally {
      setSaving(false)
    }
  }

  const abilityInfo = row ? JOURNEY_BOSS_ABILITY_MAP[row.abilityKey] : null
  const editRows: ParamEditRow[] = keys.map((key) => {
    const info = JOURNEY_MONSTER_PARAM_KEY_MAP[key] ?? { color: 'default', label: key }
    return {
      code: key,
      label: info.label,
      value: editing[key] ?? null,
      defaultValue: JOURNEY_BOSS_ABILITY_PARAMS[row?.abilityKey ?? '']?.defaults[key] ?? 0,
      rowId: paramRows.find((p) => p.code === key)?.id ?? null,
      ownerAbilities: [],
    }
  })

  return (
    <Drawer
      title={row ? `${row.name} · ${abilityInfo?.label ?? row.abilityKey}` : '妖王能力参数'}
      open={open}
      onClose={onClose}
      width={560}
      footer={
        <Space style={{ justifyContent: 'flex-end', display: 'flex' }}>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={saving} onClick={handleSave} disabled={!row?.abilityKey}>
            保存该能力参数
          </Button>
        </Space>
      }
    >
      {!row?.abilityKey ? (
        <Alert type="info" showIcon message="该怪物未配置妖王能力" description="请先在「西行管理 › 基础数据 › 怪物」页为其选择能力编码。" />
      ) : (
        <>
          <Alert
            type="info"
            showIcon
            className={common.mb16}
            message={`共 ${editRows.length} 个能力参数`}
            description="留空即回落 App 内置缺省值（保存时删除该参数行）；留空展示的灰色数值为当前缺省。改动将批量写入「怪物参数」表。"
          />
          <div className={styles.paramGrid}>
            <Text type="secondary" className={styles.paramHead}>参数键</Text>
            <Text type="secondary" className={styles.paramHead}>当前值</Text>
            <Text type="secondary" className={styles.paramHead}>缺省值</Text>
            {editRows.map((item) => (
              <React.Fragment key={item.code}>
                <span>
                  <span>{item.label}</span>
                  {item.value === null && <Tag color="orange" style={{ marginLeft: 6 }}>缺省</Tag>}
                </span>
                <InputNumber
                  style={{ width: '100%' }}
                  value={item.value}
                  step={0.01}
                  placeholder="留空=缺省"
                  onChange={(v) => setEditing((prev) => ({ ...prev, [item.code]: v }))}
                />
                <Text type="secondary">{item.defaultValue}</Text>
              </React.Fragment>
            ))}
          </div>
        </>
      )}
    </Drawer>
  )
}

export default AbilityParamDrawer
