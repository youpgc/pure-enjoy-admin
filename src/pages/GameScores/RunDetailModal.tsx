import { Button, Card, Empty, Modal, Space, Tag, Typography } from 'antd'
import { GAME_STATUS_MAP } from '../../constants'
import { formatDateTime } from '../../utils/format'
import { formatDurationSmart } from '../../utils/durationFormat'
import type { DbGame, DbGameScore, DbGameMode } from '../../types/database'
import {
  type ScoreRow,
  type RunDetail,
  runDetailOf,
  displayLevelName,
} from './types'
import styles from './index.module.css'

const { Text } = Typography

/// 属性分组：与 App JourneyAttrGroup.toJson 同构，rows 为 [标签, 值] 二元组数组。
interface AttrGroup {
  title: string
  rows: Array<[string, string]>
}

interface RunDetailModalProps {
  record: DbGameScore | null
  modeById: Record<string, DbGameMode>
  modes: DbGameMode[]
  gameMap: Record<string, DbGame>
  onClose: () => void
}

/// 从快照解析属性分组；坏行跳过，保持与 App 详情页一致的空态口径。
function parseAttrGroups(detail: RunDetail | null): AttrGroup[] {
  const raw = detail?.['attr_groups']
  if (!Array.isArray(raw)) return []
  const groups: AttrGroup[] = []
  for (const item of raw) {
    if (item == null || typeof item !== 'object') continue
    const group = item as Record<string, unknown>
    if (typeof group['title'] !== 'string') continue
    const rows: Array<[string, string]> = []
    if (Array.isArray(group['rows'])) {
      for (const row of group['rows']) {
        if (Array.isArray(row) && row.length >= 2) {
          rows.push([String(row[0] ?? ''), String(row[1] ?? '')])
        }
      }
    }
    groups.push({ title: group['title'], rows })
  }
  return groups
}

/// 成绩看板对局详情弹窗：内容布局参照 App 西行记录详情页。
/// 顶部摘要卡 + 属性分组卡片（左标签右值），数据全部取自当前成绩行的 run_detail，
/// 不额外发请求；旧记录无快照时展示空态。
export default function RunDetailModal({
  record,
  modeById,
  modes,
  gameMap,
  onClose,
}: RunDetailModalProps) {
  if (!record) return null

  const detail = runDetailOf(record)
  const groups = parseAttrGroups(detail)
  const row = record as ScoreRow

  // 标题口径与成绩列表「关卡」列一致：关卡名（剥游戏名前缀）→ 快照模式码回退 → mode_id 回退。
  let title = '对局详情'
  if (record.level_id && row.game_levels?.name) {
    title = displayLevelName(
      row.game_levels.name,
      gameMap[record.game_id]?.name
    )
  } else {
    const modeCode = detail?.['mode']
    if (typeof modeCode === 'string' && modeCode) {
      const mode = modes.find(
        (m) => m.game_id === record.game_id && m.code === modeCode
      )
      if (mode) title = mode.name
    }
    if (title === '对局详情' && record.mode_id != null) {
      title = modeById[record.mode_id]?.name ?? title
    }
  }

  const status = GAME_STATUS_MAP[record.status] ?? {
    color: 'default',
    label: record.status,
  }
  // 角色摘要口径与 App 西行记录详情页一致：三段独立拼接，任一有值即展示，
  // 避免角色名缺失时连带吞掉等级/波次；数值取整与 App 的 .round() 对齐。
  const charName = detail?.['character_name']
  const charCode = detail?.['character_code']
  const charLevel = detail?.['char_level']
  const wave = detail?.['wave']
  const kills = detail?.['kills']
  const meritGained = detail?.['merit_gained']
  const hp = detail?.['hp']
  const maxHp = detail?.['max_hp']
  const charParts: string[] = []
  if (typeof charName === 'string' && charName) {
    charParts.push(charName)
  } else if (typeof charCode === 'string' && charCode) {
    charParts.push(charCode)
  }
  if (typeof charLevel === 'number' && charLevel > 0) {
    charParts.push(`Lv${Math.round(charLevel)}`)
  }
  if (typeof wave === 'number' && wave > 0) {
    charParts.push(`第 ${Math.round(wave)} 波`)
  }
  const charLine = charParts.join(' · ')
  const statParts: string[] = []
  if (typeof kills === 'number') statParts.push(`击杀 ${kills}`)
  if (typeof meritGained === 'number') statParts.push(`功德 +${meritGained}`)
  const statLine = statParts.join(' · ')

  return (
    <Modal
      title="对局详情"
      open
      onCancel={onClose}
      width={720}
      footer={[<Button key="close" onClick={onClose}>关闭</Button>]}
      destroyOnHidden
      styles={{ body: { maxHeight: '60vh', overflowY: 'auto' } }}
    >
      <Card size="small">
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Text strong style={{ fontSize: 16 }}>{title}</Text>
          <Space wrap size={[12, 4]}>
            <Tag color={status.color}>{status.label}</Tag>
            {charLine ? <Text type="secondary">{charLine}</Text> : null}
            {statLine ? <Text type="secondary">{statLine}</Text> : null}
            {typeof hp === 'number' && typeof maxHp === 'number' ? (
              <Text type="secondary">生命 {hp}/{maxHp}</Text>
            ) : null}
            {record.duration_ms != null ? (
              <Text type="secondary">耗时 {formatDurationSmart(record.duration_ms)}</Text>
            ) : null}
            {record.played_at ? (
              <Text type="secondary">{formatDateTime(record.played_at)}</Text>
            ) : null}
          </Space>
        </Space>
      </Card>

      {groups.length === 0 ? (
        <Empty description="本局暂无属性快照" style={{ marginTop: 24 }} />
      ) : (
        groups.map((group, index) => (
          <div key={`${group.title}-${index}`} className={styles.detailGroup}>
            <Text strong>{group.title}</Text>
            <Card size="small" className={styles.detailGroupCard}>
              {group.rows.map(([label, value], rowIndex) => (
                <div className={styles.detailRow} key={`${label}-${rowIndex}`}>
                  <div className={styles.detailLabel}><Text>{label}</Text></div>
                  <div className={styles.detailValue}><Text type="secondary">{value}</Text></div>
                </div>
              ))}
            </Card>
          </div>
        ))
      )}
    </Modal>
  )
}
