// 应用版本管理的写操作数据访问层
// 集中管理 app_versions 的特殊写操作（批量回滚/发布/强制更新），避免在页面组件中裸写 supabase.from
// 注：列表/分页/删除等标准 CRUD 仍走 VersionManagement 内的 versionService（BaseService 实例）
import { supabase } from '../utils/supabase'

export const appVersionService = {
  /// 将所有 released 版本标记为 revoked
  revokeAllReleased: () =>
    (supabase.from('app_versions') as any).update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
    }).eq('status', 'released'),

  /// 将目标版本标记为 released
  releaseVersion: (id: string | number) =>
    (supabase.from('app_versions') as any).update({
      status: 'released',
      released_at: new Date().toISOString(),
      revoked_at: null,
    }).eq('id', id),

  /// 切换强制更新标志与发布类型
  setForceUpdate: (id: string | number, newForceUpdate: boolean) =>
    (supabase.from('app_versions') as any).update({
      is_force_update: newForceUpdate,
      release_type: newForceUpdate ? 'force' : 'feature',
    }).eq('id', id),
}
