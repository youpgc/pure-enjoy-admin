// 用户管理页 Hook（组合 useUserTable + useUserDetail，审查 P1 膨胀）
// 对外接口与原先完全一致：Users.tsx 无需任何改动。
import { useUserTable } from './useUserTable'
import { useUserDetail } from './useUserDetail'

export type { UserFilterValues } from './useUserTable'

export function useUsers() {
  const table = useUserTable()
  const detail = useUserDetail()
  return {
    ...table,
    ...detail,
  }
}
