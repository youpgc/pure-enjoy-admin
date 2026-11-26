import React, { useState, useEffect, useCallback } from 'react'
import { Tabs, Spin, Alert } from 'antd'
import { handleApiError } from '../../utils/apiClient'
import { useMounted } from '../../hooks/useMounted'
import {
  journeyRegionService,
  journeyMonsterService,
  journeyWeaponService,
  journeyPickupService,
  journeyCharacterService,
  gameService,
  gameLevelService,
} from '../../services/gameService'
import type { DbGameLevel, DbJourneyRegion, DbJourneyMonster, DbJourneyWeapon, DbJourneyPickup, DbJourneyCharacter } from '../../types/database'
import JourneyCrudTab from './JourneyCrudTab'
import JourneyGlobalsTab from './JourneyGlobalsTab'
import JourneyBattleParamsTab from './JourneyBattleParamsTab'
import JourneyBossAbilities from '../JourneyBossAbilities'
import JourneyWallet from '../JourneyWallet'
import JourneyEndlessEditor from '../GameLevels/JourneyEndlessEditor'
import JourneyLevelAttrsTab from './JourneyLevelAttrsTab'
import JourneyLevelScopedTab from './JourneyLevelScopedTab'
import JourneyDailyMapTab from './JourneyDailyMapTab'
import { JOURNEY_TAB_SCHEMAS } from './journeySchemas'
import { JOURNEY_BATTLE_PARAM_GROUPS } from '../../constants/journeyBattleParams'
import type { JourneyLookups, JourneyTabSchema } from './journeyTabSchema'
import common from '../../styles/common.module.css'

/// 二级 tab：一张配置表 / 全局参数 / 一组通用战斗参数。
type SecondaryTab = {
  key: string
  label: string
  kind: 'crud' | 'globals' | 'params' | 'abilities' | 'levelAttrs' | 'dailyMaps' | 'levelScoped' | 'endless'
  schema?: JourneyTabSchema
  groupCode?: string
}

/// 一级分类：按业务域聚合二级 tab。
type PrimaryTab = {
  key: string
  label: string
  children?: SecondaryTab[]
  /// 整页承载的内容（如西行钱包），不套二级 Tab 条
  content?: React.ReactNode
}

const schemaOf = (key: string): JourneyTabSchema | undefined =>
  JOURNEY_TAB_SCHEMAS.find((s) => s.key === key)

const crud = (key: string, label?: string): SecondaryTab => {
  const schema = schemaOf(key)
  return { key, label: label ?? schema?.label ?? key, kind: 'crud', schema }
}

/// 西行管理中心：一级分类 + 二级具体内容两级菜单。
/// 西行关卡子表属性、波次/热区/参照物、游历地图与无尽妖潮统一收归
/// 「关卡编排」；本页 lookup 的「关卡」选项即 game_levels 西行行的
/// level_no→难名。表由 /workspace/sql/journey DDL 创建。
const PRIMARY_TABS: PrimaryTab[] = [
  {
    key: 'basic',
    label: '基础数据',
    children: [
      crud('regions'),
      crud('monsters'),
      crud('weapons'),
      crud('weapon_levels'),
      crud('pickups'),
      crud('drops'),
      crud('relic_unlocks'),
    ],
  },
  {
    key: 'character',
    label: '角色与养成',
    children: [
      crud('characters'),
      crud('character_aura_params'),
      crud('realm_titles'),
      crud('talent_branches'),
      crud('weapon_slots'),
      crud('unlock_entries', '解锁规则'),
      crud('upgrade_cards'),
      crud('evo_recipes'),
    ],
  },
  {
    key: 'balance',
    label: '数值与平衡',
    children: [
      { key: 'globals', label: '全局参数', kind: 'globals' },
      crud('weapon_params'),
      crud('monster_params'),
      { key: 'boss_abilities', label: '妖王能力', kind: 'abilities' },
      ...JOURNEY_BATTLE_PARAM_GROUPS.map<SecondaryTab>((g) => ({
        key: `battle_${g.code}`,
        label: g.label,
        kind: 'params',
        groupCode: g.code,
      })),
    ],
  },
  {
    key: 'level',
    label: '关卡编排',
    children: [
      { key: 'level_attrs', label: '关卡属性', kind: 'levelAttrs' },
      { key: 'daily_maps', label: '游历地图', kind: 'dailyMaps' },
      { key: 'level_scoped', label: '关卡细节', kind: 'levelScoped' },
      { key: 'endless', label: '无尽妖潮', kind: 'endless' },
    ],
  },
  {
    key: 'wallet',
    label: '西行钱包',
    content: <JourneyWallet />,
  },
]
const JourneyConfig: React.FC = () => {
  const mountedRef = useMounted()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [lookups, setLookups] = useState<JourneyLookups>({
    regions: [],
    levels: [],
    monsters: [],
    monstersById: [],
    weapons: [],
    weaponsByCode: [],
    passiveWeapons: [],
    pickups: [],
    characters: [],
  })

  const loadLookups = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      // 关卡选项改自 game_levels（journey_levels 已退役）：先取西行 game id
      const gamesRes = await gameService.findAll((q) => q.eq('code', 'journey'))
      const journeyId = gamesRes.data?.[0]?.id
      const [regions, levels, monsters, weapons, pickups, characters] = await Promise.all([
        journeyRegionService.findAll(),
        journeyId
          ? gameLevelService.findAllByGame(journeyId)
          : Promise.resolve({ success: false, data: null } as any),
        journeyMonsterService.findAll(),
        journeyWeaponService.findAll(),
        journeyPickupService.findAll(),
        journeyCharacterService.findAll(),
      ])
      // 表未建（SQL 未执行）时 findAll 走失败分支返回 success=false，不抛异常
      // levels 也纳入判定：journey 游戏未配置或查询失败时关卡下拉为空，需显式告警
      const failed = [regions, levels, monsters, weapons, pickups, characters].some((r) => !r.success)
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
      const characterRows = (characters.data ?? []) as DbJourneyCharacter[]
      setLookups({
        regions: regionRows.map((r) => ({ value: r.id, label: `${r.name}（${r.code}）` })),
        levels: levelRows.map((l) => ({ value: l.id, label: `第${l.level_no}难 ${l.name}` })),
        monsters: monsterRows.map((m) => ({
          value: m.code,
          label: `${m.name}（${m.code}）`,
          tier: m.ai_tier ?? undefined,
        })),
        // uuid 外键列专用（monster_params.monster_id），value=id 而非 code；
        // tier 供逐怪参数按 AI 档位筛选（普通/精英/妖王）
        monstersById: monsterRows.map((m) => ({
          value: m.id,
          label: `${m.name}（${m.code}）`,
          tier: m.ai_tier ?? undefined,
        })),
        weapons: weaponRows.map((w) => ({ value: w.id, label: `${w.name}（${w.code}）` })),
        weaponsByCode: weaponRows.map((w) => ({ value: w.code, label: `${w.name}（${w.code}）` })),
        passiveWeapons: weaponRows
          .filter((w) => w.category === 'passive')
          .map((w) => ({ value: w.id, label: `${w.name}（${w.code}）` })),
        pickups: pickupRows.map((p) => ({ value: p.code, label: `${p.name}（${p.code}）` })),
        characters: characterRows.map((c) => ({ value: c.code, label: `${c.name}（${c.code}）` })),
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
        <Spin tip="加载西行管理查找表…" />
      </div>
    )
  }

  const renderSecondary = (child: SecondaryTab): React.ReactNode => {
    switch (child.kind) {
      case 'globals':
        return <JourneyGlobalsTab />
      case 'params':
        return child.groupCode ? (
          <JourneyBattleParamsTab groupCode={child.groupCode} />
        ) : null
      case 'abilities':
        return <JourneyBossAbilities />
      case 'levelAttrs':
        return <JourneyLevelAttrsTab lookups={lookups} />
      case 'dailyMaps':
        return <JourneyDailyMapTab lookups={lookups} />
      case 'levelScoped':
        return <JourneyLevelScopedTab lookups={lookups} />
      case 'endless':
        return <JourneyEndlessEditor />
      case 'crud':
      default:
        return child.schema ? (
          <JourneyCrudTab schema={child.schema} lookups={lookups} />
        ) : null
    }
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
        defaultActiveKey="basic"
        destroyInactiveTabPane
        items={PRIMARY_TABS.map((primary) => ({
          key: primary.key,
          label: primary.label,
          children: primary.content ?? (
            <Tabs
              defaultActiveKey={primary.children?.[0]?.key}
              destroyInactiveTabPane
              items={(primary.children ?? []).map((child) => ({
                key: child.key,
                label: child.label,
                children: renderSecondary(child),
              }))}
            />
          ),
        }))}
      />
    </div>
  )
}

export default JourneyConfig
