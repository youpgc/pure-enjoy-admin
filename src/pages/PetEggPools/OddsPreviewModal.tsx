import React, { useState } from 'react'
import { Modal, Descriptions, Tag, Collapse } from 'antd'
import type { PetEggPoolRow } from '../../types/pet'
import { PET_FAMILY_LABELS } from '../../constants/pet'
import { asObject } from '../../components/form/pet/editors/shared'
import { stringifyJson } from '../../utils/petJson'
import common from '../../styles/common.module.css'
import styles from './index.module.css'

// ==================== 蛋池公示预览（镜像 App「产出概率说明」卡片） ====================
//
// 展示口径与 App 端 pet_odds_screen 一一对应，保证「后台所见 = 用户所见」：
// - 评级行：N→SSR 固定序，组内归一化占比；
// - 系别行：权重降序（同权按 key 升序），组内归一化；
// - 性别行：读 weights.gender.male（0~1），母 = 1 - 公；
// - 未配置的组整组不渲染（不显示 0%、不写死文案）；
// - 初始蛋（initial_ssr）用自选/固定横幅替代副标题。

// App 公示转译文案镜像
const RARITY_NAMES: Record<string, string> = {
  N: 'N 级·普通',
  R: 'R 级·稀有',
  SR: 'SR 级·史诗',
  SSR: 'SSR 级·传说',
}
const RARITY_ORDER = ['N', 'R', 'SR', 'SSR'] as const
const RARITY_SHORT: Record<string, string> = { n: 'N', r: 'R', sr: 'SR', ssr: 'SSR' }

/** 家系展示名：登记家系加「系」后缀（App _familyNames 同口径），未登记原样展示 */
function familyName(code: string): string {
  const label = PET_FAMILY_LABELS[code]
  return label ? `${label}系` : code
}

/** 蛋池编码 → 展示名（egg_* 固定名 / breed_{系}_{评级} 解析 / 其余原码） */
function poolDisplayName(code: string): string {
  switch (code) {
    case 'egg_n':
      return '普通宠物蛋'
    case 'egg_r':
      return '稀有宠物蛋'
    case 'egg_sr':
      return '史诗宠物蛋'
    case 'egg_ssr':
      return '传说宠物蛋'
    case 'initial_ssr':
      return '初始宠物蛋'
  }
  const m = /^breed_([a-z]+)_(n|r|sr|ssr)$/.exec(code)
  if (m) {
    return `繁育蛋·${familyName(m[1] ?? '')}${RARITY_SHORT[m[2] ?? ''] ?? m[2]}`
  }
  return code
}

/** 组内归一化占比：两位精度消浮点残差；整数不带小数位，否则一位小数 */
function pctOf(v: number, total: number): string {
  if (total <= 0) return '0%'
  const p = Math.round((v / total) * 100 * 100) / 100
  return `${Number.isInteger(p) ? p : p.toFixed(1)}%`
}

/** 数值化键值对（过滤非数值，weight 缺失/脏值不参与归一） */
function numericEntries(obj: Record<string, unknown>): Array<[string, number]> {
  return Object.entries(obj).filter(([, v]) => typeof v === 'number') as Array<[string, number]>
}

/** 蛋池图标键（App _eggIconKey 同口径）：egg_ 前缀直用、initial_ssr → egg_initial_ssr、breed_ 前缀与其他编码无专属图 */
function eggIconKey(code: string): string | null {
  if (code.startsWith('breed_')) return null
  if (code === 'initial_ssr') return 'egg_initial_ssr'
  return code.startsWith('egg_') ? code : null
}

/** 蛋池图标：双端同源 SVG（App assets/pets/items ↔ Admin public/pet-icons）；
 *  无键或加载缺失回退蛋形轮廓（App egg_outlined Material 字形同观感）。
 *  ⚠️ 必须带 import.meta.env.BASE_URL 前缀（vite base=/pure-enjoy-admin/，绝对路径部署后 404） */
const EggIcon: React.FC<{ poolCode: string }> = ({ poolCode }) => {
  const [failed, setFailed] = useState(false)
  const key = eggIconKey(poolCode)
  if (!key || failed) {
    return (
      <svg viewBox="0 0 24 24" width={24} height={24} aria-hidden>
        <path
          d="M12 3C8.7 3 5.5 8.6 5.5 13.2 5.5 16.9 8.4 20 12 20s6.5-3.1 6.5-6.8C18.5 8.6 15.3 3 12 3z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        />
      </svg>
    )
  }
  return (
    <img
      alt={key}
      src={`${import.meta.env.BASE_URL}pet-icons/${key}.svg`}
      width={24}
      height={24}
      onError={() => setFailed(true)}
    />
  )
}

/** 评级说明行（N→SSR 固定序，组内归一化） */
function rarityLines(weights: Record<string, unknown>): string[] {
  const entries = numericEntries(asObject(weights.rarity))
  const codes = RARITY_ORDER.filter((k) => entries.some(([c]) => c === k))
  if (codes.length === 0) return []
  const total = entries.reduce((s, [, v]) => s + v, 0)
  return codes.map(
    (k) => `${RARITY_NAMES[k] ?? k} ${pctOf(entries.find(([c]) => c === k)![1], total)}`,
  )
}

/** 系别说明行（权重降序，同权按编码升序，组内归一化） */
function familyLines(weights: Record<string, unknown>): string[] {
  const entries = numericEntries(asObject(weights.families))
  if (entries.length === 0) return []
  const total = entries.reduce((s, [, v]) => s + v, 0)
  const sorted = [...entries].sort((a, b) => (Math.abs(b[1] - a[1]) < 1e-9 ? a[0].localeCompare(b[0]) : b[1] - a[1]))
  return sorted.map(([k, v]) => `${familyName(k)} ${pctOf(v, total)}`)
}

/** 性别说明行（读 gender.male，母 = 1 - 公；未配置整组不渲染） */
function genderLines(weights: Record<string, unknown>): string[] {
  const male = asObject(weights.gender).male
  if (typeof male !== 'number') return []
  return [`公 ${pctOf(male, 1)} · 母 ${pctOf(1 - male, 1)}`]
}

/** 概率组：无数据整组不渲染 */
function OddsGroup({ label, lines }: { label: string; lines: string[] }) {
  if (lines.length === 0) return null
  return (
    <div className={styles.oddsGroup}>
      <span className={styles.oddsGroupLabel}>{label}</span>
      <div className={styles.oddsChips}>
        {lines.map((line) => (
          <span key={line} className={styles.oddsChip}>
            {line}
          </span>
        ))}
      </div>
    </div>
  )
}

interface Props {
  row: PetEggPoolRow | null
  onClose: () => void
}

const OddsPreviewModal: React.FC<Props> = ({ row, onClose }) => {
  // weights 为可空 jsonb，先经 asObject 归一（字符串脏值/空值均回退空对象）
  const weights = asObject(row?.weights)
  // 初始蛋横幅：配了 initial_choices = 自选，否则固定（与 App 口径一致）
  const hasInitialChoices = Object.values(asObject(weights.initial_choices)).some(
    (v) => Array.isArray(v) && v.length > 0,
  )

  return (
    <Modal
      title={`公示预览 · ${row?.pool_code ?? ''} v${row?.config_version ?? ''}`}
      open={row !== null}
      footer={null}
      onCancel={onClose}
      width={560}
    >
      {row && (
        <>
          <Descriptions size="small" column={2} className={common.mb16}>
            <Descriptions.Item label="发布状态">
              {row.published ? <Tag color="green">已发布（App 可见）</Tag> : <Tag>未发布（App 不可见）</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="版本">v{row.config_version}</Descriptions.Item>
          </Descriptions>

          <div className={styles.oddsCard}>
            <div className={styles.oddsHead}>
              <span className={styles.eggIcon}>
                <EggIcon key={row.pool_code} poolCode={row.pool_code} />
              </span>
              <span className={styles.poolName}>{poolDisplayName(row.pool_code)}</span>
            </div>
            {row.pool_code === 'initial_ssr' ? (
              <div className={styles.initialBanner}>
                {hasInitialChoices ? '孵化时自选获得一只初始 SSR' : '孵化固定获得一只初始 SSR'}
              </div>
            ) : (
              <div className={styles.oddsSubtitle}>孵化后将获得以下说明中的一种</div>
            )}
            <OddsGroup label="评级" lines={rarityLines(weights)} />
            <OddsGroup label="系别" lines={familyLines(weights)} />
            <OddsGroup label="性别" lines={genderLines(weights)} />
          </div>

          <div className={styles.oddsFootnote}>每次抽取的随机结果相互独立，短期内不必然按比例出现。</div>

          <Collapse
            ghost
            size="small"
            items={[
              {
                key: 'raw',
                label: '原始 weights（调试）',
                children: (
                  <pre className={common.mb16} style={{ maxHeight: 240, overflow: 'auto', fontSize: 12 }}>
                    {stringifyJson(row.weights)}
                  </pre>
                ),
              },
            ]}
          />
        </>
      )}
    </Modal>
  )
}

export default OddsPreviewModal
