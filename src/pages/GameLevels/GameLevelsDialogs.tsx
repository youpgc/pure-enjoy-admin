import React from 'react'
import type { FormInstance } from 'antd'
import type { DbGame, DbGameLevel } from '../../types/database'
import LevelFormModal from './LevelFormModal'

interface Props {
  lookups: {
    games: DbGame[]
    modes: { id: string; code: string; name: string }[]
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
  }
  actions: {
    onSubmit: () => void
    onCloseModal: () => void
  }
}

/// 关卡页弹窗区：只保留关卡主体表单；西行波次/游历地图编辑器已迁至西行管理。
const GameLevelsDialogs: React.FC<Props> = ({ lookups, formState, state, actions }) => (
  <LevelFormModal
    open={state.modalVisible}
    editing={state.editing}
    saving={formState.saving}
    form={formState.instance}
    resolveValues={formState.resolveValues}
    games={lookups.games}
    modes={lookups.modes}
    formKey={formState.formKey}
    onSubmit={actions.onSubmit}
    onClose={actions.onCloseModal}
  />
)

export default GameLevelsDialogs
