// 页面组件懒加载注册表：首屏仅打包 Login，进入对应菜单时才加载对应 chunk，
// 避免全部页面同步打进主 bundle（按需加载纪律）。
// PageKey 与 lazy 组件一一对应，新增页面只需在此登记；
// 未登记 key 由 MainLayout 渲染层回退 Dashboard。
import { lazy, type LazyExoticComponent } from 'react'
import type { PageKey } from '../contexts/NavigationContext'

const Dashboard = lazy(() => import('../pages/Dashboard'))
const Users = lazy(() => import('../pages/Users'))
const Expenses = lazy(() => import('../pages/Expenses'))
const MoodDiaries = lazy(() => import('../pages/MoodDiaries'))
const WeightRecords = lazy(() => import('../pages/WeightRecords'))
const Notes = lazy(() => import('../pages/Notes'))
const VersionManagement = lazy(() => import('../pages/VersionManagement'))
const RolePermission = lazy(() => import('../pages/RolePermission'))
const Analytics = lazy(() => import('../pages/Analytics'))
const OperationLogs = lazy(() => import('../pages/OperationLogs'))
const SystemMonitor = lazy(() => import('../pages/SystemMonitor'))
const Favorites = lazy(() => import('../pages/Favorites'))
const Reminders = lazy(() => import('../pages/Reminders'))
const Habits = lazy(() => import('../pages/Habits'))
const Anniversaries = lazy(() => import('../pages/Anniversaries'))
const AppConfigs = lazy(() => import('../pages/AppConfigs'))
const DictManagement = lazy(() => import('../pages/DictManagement'))
const SensitiveWords = lazy(() => import('../pages/SensitiveWords'))
const SensitiveWordAnalytics = lazy(() => import('../pages/SensitiveWordAnalytics'))
const FileManagement = lazy(() => import('../pages/FileManagement'))
const Notifications = lazy(() => import('../pages/Notifications'))
const Announcements = lazy(() => import('../pages/Announcements'))
const Feedback = lazy(() => import('../pages/Feedback'))
const PointsManagement = lazy(() => import('../pages/PointsManagement'))
const CheckinManagement = lazy(() => import('../pages/CheckinManagement'))
const ErrorLogs = lazy(() => import('../pages/ErrorLogs'))
const LoginLogs = lazy(() => import('../pages/LoginLogs'))
const GameConfigs = lazy(() => import('../pages/GameConfigs'))
const GameLevels = lazy(() => import('../pages/GameLevels'))
const GameRewardRules = lazy(() => import('../pages/GameRewardRules'))
const GameScores = lazy(() => import('../pages/GameScores'))
const GameAnalytics = lazy(() => import('../pages/GameAnalytics'))
const GameItems = lazy(() => import('../pages/GameItems'))
const GameAchievements = lazy(() => import('../pages/GameAchievements'))
const GameRewardRecords = lazy(() => import('../pages/GameRewardRecords'))
const GameModes = lazy(() => import('../pages/GameModes'))
const PetForm = lazy(() => import('../pages/PetForm'))
const PetShop = lazy(() => import('../pages/PetShop'))
const PetPlay = lazy(() => import('../pages/PetPlay'))
const PetOps = lazy(() => import('../pages/PetOps'))
const PetConfig = lazy(() => import('../pages/PetConfig'))
const Profile = lazy(() => import('../pages/Profile'))

export const PAGE_COMPONENTS: Record<PageKey, LazyExoticComponent<any>> = {
  dashboard: Dashboard,
  users: Users,
  roles: RolePermission,
  expenses: Expenses,
  mood: MoodDiaries,
  weight: WeightRecords,
  notes: Notes,
  versions: VersionManagement,
  notifications: Notifications,
  analytics: Analytics,
  operation_logs: OperationLogs,
  system_monitor: SystemMonitor,
  favorites: Favorites,
  reminders: Reminders,
  habits: Habits,
  anniversaries: Anniversaries,
  app_configs: AppConfigs,
  dict_management: DictManagement,
  sensitive_words: SensitiveWords,
  sensitive_word_analytics: SensitiveWordAnalytics,
  file_management: FileManagement,
  announcements: Announcements,
  feedback: Feedback,
  points: PointsManagement,
  checkin: CheckinManagement,
  error_logs: ErrorLogs,
  login_logs: LoginLogs,
  game_configs: GameConfigs,
  game_levels: GameLevels,
  game_reward_rules: GameRewardRules,
  game_scores: GameScores,
  game_analytics: GameAnalytics,
  game_items: GameItems,
  game_achievements: GameAchievements,
  game_reward_records: GameRewardRecords,
  game_modes: GameModes,
  pet_form: PetForm,
  pet_shop: PetShop,
  pet_play: PetPlay,
  pet_ops: PetOps,
  pet_config: PetConfig,
  profile: Profile,
}
