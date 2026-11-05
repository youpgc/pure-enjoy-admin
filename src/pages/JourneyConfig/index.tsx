import React, { useState, useEffect, useCallback } from 'react'
import { Tabs, Spin, Alert } from 'antd'
import { handleApiError } from '../../utils/apiClient'
import { useMounted } from '../../hooks/useMounted'
import {
  journeyRegionService,
  journeyMonsterService,
  journeyWeaponService,
  journeyPickupService,
  gameService,
  gameLevelService,
} from '../../services/gameService'
import type { DbGameLevel, DbJourneyRegion, DbJourneyMonster, DbJourneyWeapon, DbJourneyPickup } from '../../types/database'
import JourneyCrudTab from './JourneyCrudTab'
import { JOURNEY_TAB_SCHEMAS } from './journeySchemas'
import type { JourneyLookups } from './journeyTabSchema'
import common from '../../styles/common.module.css'

/// 西行（journey）配置中心：14 张扩展配置表按类型分 Tab 维护。
/// 关卡走 GameLevels（game_levels，81 难）；本页 lookup 中的「关卡」选项
/// 即 game_levels 西行行的 level_no→难名。表由 /workspace/sql/journey DDL
/// 创建，执行前各 Tab 查询报错属预期。
const JourneyConfig: React.FC = () => {
  const mountedRef = useMounted()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [lookups, setLookups] = useState<JourneyLookups>({
    regions: [],
    levels: [],
    monsters: [],
    weapons: [],
    passiveWeapons: [],
    pickups: [],
  })

  const loadLookups = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      // 关卡选项改自 game_levels（journey_levels 已退役）：先取西行 game id
      const gamesRes = await gameService.findAll((q) => q.eq('code', 'journey'))
      const journeyId = gamesRes.data?.[0]?.id
      const [regions, levels, monsters, weapons, pickups] = await Promise.all([
        journeyRegionService.findAll(),
        journeyId
          ? gameLevelService.findAllByGame(journeyId)
          : Promise.resolve({ success: false, data: null } as any),
        journeyMonsterService.findAll(),
        journeyWeaponService.findAll(),
        journeyPickupService.findAll(),
      ])
      // 表未建（SQL 未执行）时 findAll 走失败分支返回 success=false，不抛异常
      const failed = [regions, monsters, weapons, pickups].some((r) => !r.success)
      if (failed) {
        if (mountedRef.current) {
          setLoadError('journey 配置表暂不可用（SQL 未执行或网络异常），下拉选项可能为空')
        }
      }
      if (!mountedRef.current) return
      const regionRows = (regions.data ?? []) as DbJourneyRegion[]
      const levelRows = (levels.data ?? []) as DbGameLevel[]
      const monsterRows = (monsters.data ?? []) as DbJourneyMonster[]
      const weaponRows = (weapons.data ?? []) as DbJourneyWeapon[]
      const pickupRows = (pickups.data ?? []) as DbJourneyPickup[]
      setLookups({
        regions: regionRows.map((r) => ({ value: r.id, label: `${r.name}（${r.code}）` })),
        levels: levelRows.map((l) => ({ value: l.id, label: `第${l.level_no}难 ${l.name}` })),
        monsters: monsterRows.map((m) => ({ value: m.code, label: `${m.name}（${m.code}）` })),
        weapons: weaponRows.map((w) => ({ value: w.id, label: `${w.name}（${w.code}）` })),
        passiveWeapons: weaponRows
          .filter((w) => w.category === 'passive')
          .map((w) => ({ value: w.id, label: `${w.name}（${w.code}）` })),
        pickups: pickupRows.map((p) => ({ value: p.code, label: `${p.name}（${p.code}）` })),
      })
    } catch (error) {
      handleApiError(error, 'JourneyConfig-查找表加载')
      if (mountedRef.current) setLoadError('journey 配置表加载失败（SQL 未执行或网络异常）')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [mountedRef])

  useEffect(() => {
    loadLookups()
  }, [loadLookups])

  if (loading) {
    return (
      <div className={common.flexCenter} style={{ padding: '80px 0' }}>
        <Spin tip="加载西行配置查找表…" />
      </div>
    )
  }

  return (
    <div>
      {loadError && (
        <Alert
          type="warning"
          showIcon
          className={common.mb16}
          message={loadError}
          description="journey_* 表 DDL 随双端交付统一执行；执行后本页即可正常读写。"
        />
      )}
      <Tabs
        defaultActiveKey="regions"
        destroyInactiveTabPane
        items={JOURNEY_TAB_SCHEMAS.map((schema) => ({
          key: schema.key,
          label: schema.label,
          children: <JourneyCrudTab schema={schema} lookups={lookups} />,
        }))}
      />
    </div>
  )
}

export default JourneyConfig
