// 应用版本管理写操作数据访问层 —— 本地后端 /admin/app-versions
// 状态机：release（发布并自动降级同平台其他 released）/ revoke（下架当前发布）/ rollback（已下架版本回滚）
// 强制更新开关独立端点；列表/分页/创建/更新/删除由 useVersions 直接调后端标准端点
import { apiRequest } from '../utils/adminHttp'

export const appVersionService = {
  /// 状态流转：action = release | revoke | rollback
  changeStatus: (id: number | string, action: 'release' | 'revoke' | 'rollback') =>
    apiRequest<unknown>('PUT', `/admin/app-versions/${id}/status`, { action }),

  /// 强制更新开关（is_force_update 切换，release_type 与之正交）
  setForceUpdate: async (id: number | string, newForceUpdate: boolean) => {
    await apiRequest<unknown>('PUT', `/admin/app-versions/${id}/force-update`, {
      is_force_update: newForceUpdate,
    })
    return { error: null }
  },
}
