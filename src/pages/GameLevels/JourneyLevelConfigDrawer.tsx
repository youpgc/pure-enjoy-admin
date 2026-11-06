import { useEffect, useState } from 'react'
import { Drawer, Tabs } from 'antd'
import { journeyMonsterService, gameLevelService } from '../../services/gameService'
import type { DbGameLevel } from '../../types/database'
import JourneyCrudTab from '../JourneyConfig/JourneyCrudTab'
import { JOURNEY_LEVEL_SCOPED_SCHEMAS } from '../JourneyConfig/journeySchemas'
import type { JourneyLookups } from '../JourneyConfig/journeyTabSchema'

const emptyLookups: JourneyLookups = {
  regions: [],
  levels: [],
  monsters: [],
  monstersById: [],
  weapons: [],
  passiveWeapons: [],
  pickups: [],
  characters: [],
}

interface JourneyLevelConfigDrawerProps {
  open: boolean
  level: DbGameLevel | null
  onClose: () => void
}

/// 西行关卡配置抽屉：波次 / 密度热区 / 地图参照物三段，按 level_id
/// 锁定编辑（GameLevels 关卡行「配置」入口），与 App 引擎进关拉取的
/// journey_waves / journey_heat_zones / journey_map_objects 一一对应。
const JourneyLevelConfigDrawer: React.FC<JourneyLevelConfigDrawerProps> = ({
  open,
  level,
  onClose,
}) => {
  const [lookups, setLookups] = useState<JourneyLookups>(emptyLookups)

  useEffect(() => {
    if (!open) return
    // levels 映射：表格「所属关卡」列与表单下拉展示「第 N 难 · 关卡名称」
    Promise.all([
      journeyMonsterService.findAll(),
      gameLevelService.findAll(),
    ]).then(([monsters, levels]) => {
      const monsterRows = monsters.success ? monsters.data ?? [] : []
      const levelRows = levels.success ? levels.data ?? [] : []
      setLookups((prev) => ({
        ...prev,
        monsters: monsterRows.map((m: Record<string, any>) => ({
          value: String(m.code),
          label: `${m.name}（${m.code}）`,
        })),
        levels: levelRows
          .filter((l: DbGameLevel) => l.game_id === level?.game_id)
          .map((l: DbGameLevel) => ({
            value: String(l.id),
            label: `第 ${l.level_no} 难 · ${l.name}`,
          })),
      }))
    })
  }, [open])

  return (
    <Drawer
      title={`关卡配置 · 第 ${level?.level_no ?? '-'} 难 ${level?.name ?? ''}`}
      open={open}
      onClose={onClose}
      width={1020}
      destroyOnClose
    >
      <Tabs
        items={JOURNEY_LEVEL_SCOPED_SCHEMAS.map((s) => ({
          key: s.key,
          label: s.label,
          children: (
            <JourneyCrudTab
              schema={s}
              lookups={lookups}
              lockedFilterValue={level?.id ?? ''}
            />
          ),
        }))}
      />
    </Drawer>
  )
}

export default JourneyLevelConfigDrawer
