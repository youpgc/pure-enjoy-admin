// 游戏道具类型字典（从 GameItems/index.tsx 抽离，审查 P1 单文件超 500 行）
// 类型值与 App 端道具枚举同源，新增类型须三端对齐。

export const ITEM_TYPE_LABEL: Record<string, string> = {
  remove: '移出',
  undo: '撤回',
  shuffle: '洗牌',
  hammer: '破坏',
  hint: '提示',
  force_swap: '强制交换',
  magic_wand: '魔法棒',
  add_steps: '加步',
  add_time: '加时',
}

export const ITEM_TYPE_OPTIONS = [
  { value: 'remove', label: '移出（羊了个羊）' },
  { value: 'undo', label: '撤回（羊了个羊）' },
  { value: 'shuffle', label: '洗牌（羊了个羊）' },
  { value: 'hammer', label: '破坏锤（消消乐）' },
  { value: 'hint', label: '提示卡（消消乐）' },
  { value: 'force_swap', label: '强制交换（消消乐）' },
  { value: 'magic_wand', label: '魔法棒（消消乐）' },
  { value: 'add_steps', label: '加步卡（消消乐·限步 / 2048·挑战）' },
  { value: 'add_time', label: '加时卡（消消乐·限时 / 2048·限时）' },
]
