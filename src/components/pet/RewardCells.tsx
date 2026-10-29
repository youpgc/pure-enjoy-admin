import React, { useEffect, useState } from 'react'
import { Tag } from 'antd'
import { petItemService } from '../../services/petService'
import { PetItemIcon } from './PetItemIcon'
import { PET_ADVENTURE_RESULT_LABELS } from '../../constants/pet'
import { asObject, asArray, numOf } from '../form/pet/editors/shared'

// ==================== 奖励/掉落/条件 转译单元格（玩法内容各页共用） ====================
// 目录（item_code → 名称/图标）由 usePetItemCatalog 模块级缓存共享，
// 多页签只拉一次；未命中回退编码原样展示，不吞未知值。

export interface PetItemCatalogEntry {
  name: string
  icon: string | null
}
export type PetItemCatalog = Map<string, PetItemCatalogEntry>

let catalogCache: PetItemCatalog | null = null

/** 道具目录（模块级缓存；失败时返回空目录，列内道具名回退编码） */
export function usePetItemCatalog(): PetItemCatalog {
  const [catalog, setCatalog] = useState<PetItemCatalog>(catalogCache ?? new Map())
  useEffect(() => {
    if (catalogCache) return
    let alive = true
    petItemService.findAll().then((res) => {
      if (!alive || !res.success || !res.data) return
      catalogCache = new Map(
        res.data.map((i) => [i.item_code, { name: i.name, icon: i.icon ?? null }]),
      )
      setCatalog(catalogCache)
    })
    return () => {
      alive = false
    }
  }, [])
  return catalog
}

/** 道具小卡片：图标 + 名 ×N */
export const ItemChip: React.FC<{
  code: string
  count?: number
  catalog: PetItemCatalog
}> = ({ code, count, catalog }) => {
  const entry = catalog.get(code)
  return (
    <Tag style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginInlineEnd: 0 }}>
      <PetItemIcon icon={entry?.icon ?? `icon/${code}`} size={16} />
      <span>
        {entry?.name ?? code}
        {count != null && count !== 1 ? ` ×${count}` : ''}
      </span>
    </Tag>
  )
}

/** 奖励包单元格：{gold, points, exp, items:[{code,count}]} → 中文 + 道具图标
 *  （任务 rewards 与成就 reward_package 同 schema） */
export const RewardPackageCell: React.FC<{ value: unknown; catalog: PetItemCatalog }> = ({
  value,
  catalog,
}) => {
  const obj = asObject(value)
  const gold = numOf(obj.gold)
  const points = numOf(obj.points)
  const exp = numOf(obj.exp)
  const items = asArray(obj.items)
    .map((i) => asObject(i))
    .filter((i) => typeof i.code === 'string')
  if (!gold && !points && !exp && items.length === 0) return <>-</>
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
      {gold ? <Tag color="gold" style={{ marginInlineEnd: 0 }}>金币 {gold}</Tag> : null}
      {points ? <Tag color="blue" style={{ marginInlineEnd: 0 }}>积分 {points}</Tag> : null}
      {exp ? <Tag color="purple" style={{ marginInlineEnd: 0 }}>经验 {exp}</Tag> : null}
      {items.map((i, idx) => (
        <ItemChip
          key={`${String(i.code)}_${idx}`}
          code={String(i.code)}
          count={numOf(i.count, 1) ?? undefined}
          catalog={catalog}
        />
      ))}
    </span>
  )
}

/** 数量区间/概率的紧凑展示（掉落表用）：[5,15] → 5~15；p 0.25 → 25% */
const rangeText = (v: unknown): string => {
  const arr = Array.isArray(v) ? v : []
  if (arr.length === 0) return ''
  const a = numOf(arr[0])
  const b = numOf(arr[1])
  if (a == null && b == null) return ''
  if (a != null && a === b) return String(a)
  return `${a ?? '?'}~${b ?? '?'}`
}
const pctText = (p: unknown): string => {
  const n = numOf(p)
  return n == null ? '' : `${Math.round(n * 100)}%`
}

/** 游历掉落单元格：{play|help|memory:{gold:[a,b],exp:[a,b],items:[{code,min,max,p}]},
 *  long_only:[{p,code}]} → 按结果类型分行，道具带图标，概率尾注 */
export const DropTableCell: React.FC<{ value: unknown; catalog: PetItemCatalog }> = ({
  value,
  catalog,
}) => {
  const obj = asObject(value)
  const resultKeys = Object.keys(obj).filter((k) => k !== 'long_only')
  const longOnly = asArray(obj.long_only)
    .map((i) => asObject(i))
    .filter((i) => typeof i.code === 'string')
  if (resultKeys.length === 0 && longOnly.length === 0) return <>-</>
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      {resultKeys.map((k) => {
        const grp = asObject(obj[k])
        const drops = asArray(grp.items)
          .map((i) => asObject(i))
          .filter((i) => typeof i.code === 'string')
        const hasGold = Array.isArray(grp.gold)
        const hasExp = Array.isArray(grp.exp)
        if (!hasGold && !hasExp && drops.length === 0) return null
        return (
          <div
            key={k}
            style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}
          >
            <Tag color="cyan" style={{ marginInlineEnd: 0 }}>
              {PET_ADVENTURE_RESULT_LABELS[k] ?? k}
            </Tag>
            {hasGold ? (
              <Tag color="gold" style={{ marginInlineEnd: 0 }}>金币 {rangeText(grp.gold)}</Tag>
            ) : null}
            {hasExp ? (
              <Tag color="purple" style={{ marginInlineEnd: 0 }}>经验 {rangeText(grp.exp)}</Tag>
            ) : null}
            {drops.map((d, idx) => (
              <Tag
                key={`${String(d.code)}_${idx}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginInlineEnd: 0 }}
              >
                <PetItemIcon
                  icon={catalog.get(String(d.code))?.icon ?? `icon/${String(d.code)}`}
                  size={16}
                />
                <span>
                  {catalog.get(String(d.code))?.name ?? String(d.code)} {rangeText([d.min, d.max])}
                  {d.p != null ? `（${pctText(d.p)}）` : ''}
                </span>
              </Tag>
            ))}
          </div>
        )
      })}
      {longOnly.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
          <Tag color="magenta" style={{ marginInlineEnd: 0 }}>长途保底池</Tag>
          {longOnly.map((d, idx) => (
            <Tag
              key={`${String(d.code)}_${idx}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginInlineEnd: 0 }}
            >
              <PetItemIcon
                icon={catalog.get(String(d.code))?.icon ?? `icon/${String(d.code)}`}
                size={16}
              />
              <span>
                {catalog.get(String(d.code))?.name ?? String(d.code)}
                {d.p != null ? `（${pctText(d.p)}）` : ''}
              </span>
            </Tag>
          ))}
        </div>
      ) : null}
    </div>
  )
}
