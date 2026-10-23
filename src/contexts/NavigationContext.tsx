// 页面导航上下文：PageKey 联合类型 + 带参跳转信号
// （MainLayout 持有状态并下发 Provider，各页面经 useNavigation 消费实现不刷新切换与深链定位）
import { createContext, useContext } from 'react'

export type PageKey = 'dashboard' | 'users' | 'roles' | 'expenses' | 'mood' | 'weight' | 'notes' |
  'versions' | 'analytics' | 'operation_logs' | 'system_monitor' |
  'favorites' | 'reminders' | 'habits' | 'app_configs' | 'dict_management' |
  'sensitive_words' | 'sensitive_word_analytics' | 'file_management' | 'announcements' | 'notifications' | 'feedback'
  | 'anniversaries' | 'points' | 'error_logs' | 'login_logs' | 'checkin'
  | 'game_configs' | 'game_levels' | 'game_reward_rules' | 'game_scores' | 'game_analytics' | 'game_items' | 'game_achievements' | 'game_reward_records' | 'game_modes'
  | 'pet_form' | 'pet_shop' | 'pet_play' | 'pet_ops' | 'pet_config'
  | 'profile'

/** 页签导航参数信号：keepalive 页签不重挂载，消费方按 seq 变化感知新参数 */
export interface PageNavSignal {
  seq: number
  data?: Record<string, unknown>
}

interface NavigationContextType {
  currentPage: PageKey
  setCurrentPage: (page: PageKey, params?: Record<string, unknown>) => void
  /** 各页签最近一次带参跳转的信号（不带参跳转不产生信号） */
  pageParams: Record<string, PageNavSignal>
}

export const NavigationContext = createContext<NavigationContextType>({
  currentPage: 'dashboard',
  setCurrentPage: () => {},
  pageParams: {},
})

export const useNavigation = () => useContext(NavigationContext)
