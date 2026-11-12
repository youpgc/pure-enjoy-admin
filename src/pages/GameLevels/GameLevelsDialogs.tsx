import React from 'react'
import type { FormInstance } from 'antd'
import type { DbGame, DbGameLevel, DbJourneyDailyMap } from '../../types/database'
import LevelFormModal from './LevelFormModal'
import JourneyLevelConfigDrawer from './JourneyLevelConfigDrawer'
import JourneyDailyMapModal from './JourneyDailyMapModal'

interface Props {
  lookups: {
    games: DbGame[]
    modes: { id: string; code: string; name: string }[]
    regions: { value: string; label: string }[]
  }
  formState: {
    instance: FormInstance
    formKey: string
    resolveValues: () => Record<string, any>
    saving: boolean
  }
  state: {
    modalVisible: boolean
    editing: DbGameLevel | null
    configLevel: DbGameLevel | null
    dailyEditRow: DbJourneyDailyMap | null
  }
  actions: {
    onSubmit: () => void
    onCloseModal: () => void
    onCloseConfig: () => void
    onCloseDaily: () => void
    onDailySaved: () => void
  }
}

/// 关卡页弹窗区：新增/编辑表单、西行波次配置抽屉、每日游历逐图配置。
/// 表单实例与保存逻辑由容器持有，本组件只做渲染与事件转发。
const GameLevelsDialogs: React.FC<Props> = ({ lookups, formState, state, actions }) => {
  return (
    <>
      <LevelFormModal
        open={state.modalVisible}
        editing={state.editing}
        saving={formState.saving}
        form={formState.instance}
        resolveValues={formState.resolveValues}
        games={lookups.games}
        modes={lookups.modes}
        regions={lookups.regions}
        formKey={formState.formKey}
        onSubmit={actions.onSubmit}
        onClose={actions.onCloseModal}
      />

      <JourneyLevelConfigDrawer
        open={state.configLevel !== null}
        level={state.configLevel}
        onClose={actions.onCloseConfig}
      />

      <JourneyDailyMapModal
        open={state.dailyEditRow !== null}
        mapRow={state.dailyEditRow}
        onClose={actions.onCloseDaily}
        onSaved={actions.onDailySaved}
      />
    </>
  )
}

export default GameLevelsDialogs
