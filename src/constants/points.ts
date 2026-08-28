// ==================== 积分 ====================
// ⚠️ 单一真源（type 展示映射）：本 MAP 是 point_records.type 的展示标签权威来源。
//   App 端镜像位于 lib/features/profile/screens/point_records_screen.dart 的 _getTypeInfo，
//   两端 label/color 须保持一致；新增或改名 type 时务必同步修改两端。
//   注：admin_recharge 为历史遗留别名，仅 App 端作为 admin_adjust 的兼容分支处理，本 MAP 不单列。
export const POINT_TYPE_MAP: Record<string, { color: string; label: string }> = {
  checkin:      { color: 'green',  label: '签到' },
  earn:         { color: 'green',  label: '获得' },
  spend:        { color: 'red',    label: '消费' },
  adjust:       { color: 'blue',   label: '调整' },
  admin_adjust: { color: 'purple', label: '管理员调整' },
}

// 状态展示映射（active/expired/used）。
// 注意：status 取值仅后台使用；`used` 是后台内部"已抵扣"展示态，App 端不写也不消费 status，
// 而是基于 expires_at 临近度展示 有效/即将过期/已过期（见 point_records_screen._getExpiryInfo）。
// 故 App 端无需同步 `used` 状态——两端展示口径不同属预期，不存在必须一致约束。
export const POINT_STATUS_MAP: Record<string, { color: string; label: string }> = {
  active: { color: 'green', label: '有效' },
  expired: { color: 'default', label: '已过期' },
  used: { color: 'orange', label: '已使用' },
}
