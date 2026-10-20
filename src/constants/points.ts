// ==================== 积分 ====================
// ⚠️ 单一真源（type 展示映射）：本 MAP 是 point_records.type 的展示标签权威来源。
//   App 端镜像位于 lib/features/profile/screens/point_records/point_records_parts.dart 的 _getTypeInfo，
//   两端 label/color 须保持一致；新增或改名 type 时务必同步修改两端。
//   注：admin_recharge 为历史遗留别名，仅 App 端作为 admin_adjust 的兼容分支处理，本 MAP 不单列。
//   注：expire 为积分过期镜像流水（服务端每日过期任务生成，负数、status=expired，
//       仅作留痕展示不参与余额代数和——余额扣减由原行翻转保证）。
export const POINT_TYPE_MAP: Record<string, { color: string; label: string }> = {
  checkin:      { color: 'green',  label: '签到' },
  earn:         { color: 'green',  label: '获得' },
  spend:        { color: 'red',    label: '消费' },
  adjust:       { color: 'blue',   label: '调整' },
  admin_adjust: { color: 'purple', label: '管理员调整' },
  game_earn:    { color: 'green',  label: '游戏奖励' },
  game_spend:   { color: 'red',    label: '游戏消费' },
  expire:       { color: 'orange', label: '积分过期' },
}

/// 游戏中心积分流水类型集合（GameRewardRecords 页过滤 point_records.type 用），
/// 与 App 端 grant_game_reward(p_type='game_earn') / 游戏内消费口径一致。
export const GAME_FLOW_TYPES = ['game_earn', 'game_spend'] as const

// 状态展示映射（active/expired/used）。
// 注意：status 取值仅后台使用；`used` 是后台内部"已抵扣"展示态，App 端不写也不消费 status
// （App 端原「有效/即将过期/已过期」标签已随过期镜像流水上线移除，过期以 expire 类型流水呈现）。
export const POINT_STATUS_MAP: Record<string, { color: string; label: string }> = {
  active: { color: 'green', label: '有效' },
  expired: { color: 'default', label: '已过期' },
  used: { color: 'orange', label: '已使用' },
}
