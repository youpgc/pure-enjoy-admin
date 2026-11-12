import React from 'react'
import { Alert, Button, Card, Select, Space, Typography } from 'antd'
import { ReloadOutlined, PlusOutlined } from '@ant-design/icons'
import type { DbGame } from '../../types/database'
import { JOURNEY_LEVEL_KIND_MAP } from '../../constants/game'
import styles from './index.module.css'
import common from '../../styles/common.module.css'

const { Text } = Typography

/// 筛选工具栏当前值与可选清单；容器持有状态，本组件不自发起请求。
export interface GameLevelsFilterState {
  games: DbGame[]
  modes: { id: string; code: string; name: string }[]
  regions: { value: string; label: string }[]
  selectedGameId: string
  selectedModeId: string
  regionFilter: string
  kindFilter: string
  isJourneyGame: boolean
  modeEditorView: boolean
  loading: boolean
  canWrite: boolean
}

export interface GameLevelsFilterActions {
  onGameChange: (gameId: string) => void
  onModeChange: (modeId: string) => void
  onRegionChange: (code: string) => void
  onKindChange: (kind: string) => void
  onReload: () => void
  onAdd: () => void
}

interface Props {
  filters: GameLevelsFilterState
  actions: GameLevelsFilterActions
}

/// 关卡页说明卡片与筛选工具栏：游戏 → 模式 → 区域/难别三级筛选，
/// 模式编辑器视图下隐藏主线专用控件与新增入口。
const GameLevelsToolbar: React.FC<Props> = ({ filters: f, actions: a }) => {
  return (
    <>
      <Alert
        type="info"
        showIcon
        className={common.mb16}
        message="关卡配置说明"
        description="关卡按「游戏 → 模式 → 关卡」三级组织；config 键名须与 App 引擎读取键一致：types=方块类型数（4..6，关键难度维度）；steps=0 表示不限步数（前置关建议 0，进阶关 30-45）；collect/iceCollect 支持多目标数组 [{type,count}]（type < types）；消消乐全局关序 = 模式序 ×100 + 关内序（成就/奖励区间判定用）。reward_points 为通关首通奖励（与每日首通可叠加），count_for_daily_clear 决定是否计入每日首通。"
      />
      <Card className={common.mb16}>
        <div className={common.toolbar}>
          <Space wrap>
            <Text>选择游戏：</Text>
            <Select
              className={styles.sel240}
              placeholder="请选择游戏"
              value={f.selectedGameId || undefined}
              onChange={(v) => a.onGameChange(v)}
              options={f.games.map((g) => ({ value: g.id, label: `${g.name}（${g.code}）` }))}
            />
            <Text>模式：</Text>
            <Select
              className={styles.sel240}
              placeholder="全部模式"
              allowClear
              value={f.selectedModeId || undefined}
              onChange={(v) => a.onModeChange(v || '')}
              options={f.modes.map((m) => ({ value: m.id, label: `${m.name}（${m.code}）` }))}
            />
            {!f.modeEditorView && f.isJourneyGame && (
              <>
                <Text>区域：</Text>
                <Select
                  className={styles.sel200}
                  placeholder="全部区域"
                  allowClear
                  value={f.regionFilter || undefined}
                  onChange={(v) => a.onRegionChange(v || '')}
                  options={f.regions}
                />
                <Text>难别：</Text>
                <Select
                  className={styles.sel200}
                  placeholder="全部难别"
                  allowClear
                  value={f.kindFilter || undefined}
                  onChange={(v) => a.onKindChange(v || '')}
                  options={Object.entries(JOURNEY_LEVEL_KIND_MAP).map(([value, v]) => ({ value, label: v.label }))}
                />
              </>
            )}
            {!f.modeEditorView && (
              <Button icon={<ReloadOutlined />} onClick={a.onReload} loading={f.loading}>
                刷新
              </Button>
            )}
          </Space>
          {!f.modeEditorView && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              disabled={!f.canWrite || !f.selectedGameId}
              onClick={a.onAdd}
            >
              新增关卡
            </Button>
          )}
        </div>
      </Card>
    </>
  )
}

export default GameLevelsToolbar
