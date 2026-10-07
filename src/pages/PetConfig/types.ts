// 宠物全局参数页类型（从 PetConfig/index.tsx 抽离，审查 P2-16 单文件超 500 行）

export type ModuleKey =
  | 'master'
  | 'growth'
  | 'feed'
  | 'decay'
  | 'adventure'
  | 'quest'
  | 'hatch'
  | 'economy'
  | 'newbie'
  | 'reserved_p2'

export interface FieldMeta {
  field: string
  label: string
  desc?: string
  /** 当前值列的展示格式化 */
  format?: (v: unknown) => string
}

/** 一张模块卡：key 决定弹窗表单与保存范围（PATCH 语义只提交本模块字段） */
export interface ModuleMeta {
  key: ModuleKey
  title: string
  fields: FieldMeta[]
}

/** 自定义行（历险档位/初始资源包拆行展示） */
export interface ValueRow {
  key: string
  label: string
  value: string
  desc?: string
}

/** 道具目录精简项：初始资源包编辑器按 item_code 匹配展示名 */
export interface ItemOption {
  item_code: string
  name: string
  category: string
}
