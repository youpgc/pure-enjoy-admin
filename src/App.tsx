import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout, Menu, theme, Avatar, Dropdown, Button } from 'antd'
import {
  LogoutOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  UserOutlined,
  DownOutlined,
  ReloadOutlined,
  CloseOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons'
import type { AdminUser } from './types/auth'
import { lazy, Suspense } from 'react'
import { Spin } from 'antd'
import AuthGuard from './components/AuthGuard'
import ErrorBoundary from './components/ErrorBoundary'
import { usePermission } from './hooks/usePermission'
import Login from './pages/Login'
import styles from './App.module.css'
import common from './styles/common.module.css'

// 页面级组件按需懒加载（审查 P1-4a）：首屏仅打包 Login，进入对应菜单时才加载对应 chunk，
// 避免全部 30+ 页面同步打进主 bundle（用户"按需加载"纪律 + 规范 §10）。
const Dashboard = lazy(() => import('./pages/dashboard'))
const Users = lazy(() => import('./pages/users'))
const Expenses = lazy(() => import('./pages/Expenses'))
const MoodDiaries = lazy(() => import('./pages/MoodDiaries'))
const WeightRecords = lazy(() => import('./pages/WeightRecords'))
const Notes = lazy(() => import('./pages/Notes'))
const Novels = lazy(() => import('./pages/novels'))
const VersionManagement = lazy(() => import('./pages/VersionManagement'))
const RolePermission = lazy(() => import('./pages/RolePermission'))
const Analytics = lazy(() => import('./pages/analytics'))
const OperationLogs = lazy(() => import('./pages/operationLogs'))
const SystemMonitor = lazy(() => import('./pages/SystemMonitor'))
const Favorites = lazy(() => import('./pages/Favorites'))
const Reminders = lazy(() => import('./pages/Reminders'))
const Habits = lazy(() => import('./pages/Habits'))
const Anniversaries = lazy(() => import('./pages/Anniversaries'))
const AppConfigs = lazy(() => import('./pages/AppConfigs'))
const NovelBookshelves = lazy(() => import('./pages/NovelBookshelves'))
const DictManagement = lazy(() => import('./pages/DictManagement'))
const SensitiveWords = lazy(() => import('./pages/SensitiveWords'))
const SensitiveWordAnalytics = lazy(() => import('./pages/SensitiveWordAnalytics'))
const FileManagement = lazy(() => import('./pages/fileManagement'))
const Notifications = lazy(() => import('./pages/notifications'))
const Announcements = lazy(() => import('./pages/Announcements'))
const Feedback = lazy(() => import('./pages/feedback'))
const PointsManagement = lazy(() => import('./pages/PointsManagement'))
const CheckinManagement = lazy(() => import('./pages/CheckinManagement'))
const ErrorLogs = lazy(() => import('./pages/ErrorLogs'))
const NovelComments = lazy(() => import('./pages/NovelComments'))
const Rankings = lazy(() => import('./pages/rankings'))
const Bookmarks = lazy(() => import('./pages/Bookmarks'))
const Annotations = lazy(() => import('./pages/annotations'))
const Recommendations = lazy(() => import('./pages/Recommendations'))
const TtsManagement = lazy(() => import('./pages/TtsManagement'))
const LoginLogs = lazy(() => import('./pages/LoginLogs'))
const GameConfigs = lazy(() => import('./pages/GameConfigs'))
const GameLevels = lazy(() => import('./pages/GameLevels'))
const GameRewardRules = lazy(() => import('./pages/GameRewardRules'))
const GameScores = lazy(() => import('./pages/GameScores'))
const GameAnalytics = lazy(() => import('./pages/GameAnalytics'))
const GameItems = lazy(() => import('./pages/GameItems'))
const GameAchievements = lazy(() => import('./pages/GameAchievements'))
const GameRewardRecords = lazy(() => import('./pages/GameRewardRecords'))
const Profile = lazy(() => import('./pages/Profile'))
import { supabase } from './utils/supabase'
import { buildMenuItems } from './config/menuConfig'
import { PAGE_TITLES } from './config/pageTitles'

const { Header, Sider, Content } = Layout

// ========== AuthContext (使用 Supabase Auth) ==========
interface AuthContextType {
  user: AdminUser | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
})

export const useAuth = () => useContext(AuthContext)

const InlineAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 从 Supabase Auth 会话构建 AdminUser
  // 注意：Supabase Auth 的 role 字段在 app_metadata 中，user_metadata 中的是自定义角色
  // ⚠️ 此处 role 取自 JWT metadata，仅供展示（如顶栏），严禁用于权限/角色判定！
  //    权限判定必须走 usePermission（get_my_role RPC）或 AuthGuard（is_admin RPC），
  //    以数据库 public.users.role 为准（JWT metadata 可被用户自改，见审查报告 P1b）。
  const buildAdminUser = useCallback((authUser: any): AdminUser | null => {
    if (!authUser) return null
    const metadata = authUser.user_metadata || {}
    const appMetadata = authUser.app_metadata || {}
    // 优先读取 user_metadata.role（自定义管理员角色），其次 app_metadata.role（Supabase 默认角色）
    const role = metadata.role || appMetadata.role || 'viewer'
    return {
      id: authUser.id,
      email: authUser.email || '',
      role: role,
      nickname: metadata.nickname || metadata.name || '',
      avatar_url: metadata.avatar_url,
      username: metadata.username || '',
      phone: metadata.phone || '',
      gender: metadata.gender || '',
      height: typeof metadata.height === 'number' ? metadata.height : undefined,
      created_at: authUser.created_at,
    }
  }, [])

  // 监听 Supabase Auth 状态变化
  useEffect(() => {
    // 初始化时获取当前会话
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(buildAdminUser(session.user))
        }
      } catch (e) {
        if (import.meta.env.DEV) {
          console.error('[Auth] 获取会话失败:', e)
        }
      } finally {
        setIsLoading(false)
      }
    }

    initSession()

    // 订阅 Auth 状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser(buildAdminUser(session.user))
        } else {
          setUser(null)
        }
        setIsLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [buildAdminUser])

  const login = useCallback(async (_username: string, _password: string) => {
    // 登录逻辑在 Login.tsx 中处理，此处仅作为占位
    throw new Error('请使用 Login.tsx 中的登录逻辑')
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// ========== Navigation Context ==========
export type PageKey = 'dashboard' | 'users' | 'roles' | 'expenses' | 'mood' | 'weight' | 'notes' |
  'novels' | 'novel_bookshelves' | 'novel_comments' | 'rankings' | 'bookmarks' | 'annotations' | 'versions' | 'analytics' | 'operation_logs' | 'system_monitor' |
  'favorites' | 'reminders' | 'habits' | 'app_configs' | 'dict_management' |
  'sensitive_words' | 'sensitive_word_analytics' | 'file_management' | 'announcements' | 'notifications' | 'feedback'
  | 'anniversaries' | 'points' | 'error_logs' | 'recommendations' | 'tts_management' | 'login_logs' | 'checkin'
  | 'game_configs' | 'game_levels' | 'game_reward_rules' | 'game_scores' | 'game_analytics' | 'game_items' | 'game_achievements' | 'game_reward_records'
  | 'profile'

interface NavigationContextType {
  currentPage: PageKey
  setCurrentPage: (page: PageKey) => void
}

export const NavigationContext = createContext<NavigationContextType>({
  currentPage: 'dashboard',
  setCurrentPage: () => {},
})

export const useNavigation = () => useContext(NavigationContext)

// ========== MainLayout ==========
const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [openKeys, setOpenKeys] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard')
  // 已打开页签（keepalive）：默认含仪表盘，切换 / 跳转页面时追加，关闭页签时移除（仅当前会话，不持久化到 sessionStorage）
  const [openTabs, setOpenTabs] = useState<PageKey[]>(['dashboard'])
  // 统一跳转入口：激活页签 + 按需追加到已打开列表（供侧边菜单与子页面 useNavigation 复用，实现不刷新切换）
  const openPage = useCallback((page: PageKey) => {
    setCurrentPage(page)
    setOpenTabs((prev) => (prev.includes(page) ? prev : [...prev, page]))
  }, [])

  // ========== 页签增强：刷新 / 关闭 / 右键菜单 ==========
  const [refreshKeys, setRefreshKeys] = useState<Record<string, number>>({})
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; tab: PageKey } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // 页签横向滚动（溢出时左右箭头可用）
  const tabListRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // 刷新：递增对应页签 key，强制组件重挂载（重新拉取数据）
  const refreshTab = useCallback((target: PageKey) => {
    setRefreshKeys((prev) => ({ ...prev, [target]: (prev[target] ?? 0) + 1 }))
  }, [])
  // 关闭单个（首页 dashboard 不可关闭）
  const closeTab = useCallback((target: PageKey) => {
    if (target === 'dashboard') return
    setOpenTabs((prev) => prev.filter((t) => t !== target))
  }, [])
  // 关闭其他：保留首页 + 当前右键页签（dashboard 永不被关）
  const closeOthers = useCallback((target: PageKey) => {
    setOpenTabs(Array.from(new Set(['dashboard', target])))
    setCurrentPage(target)
  }, [])
  // 关闭右侧：保留到当前右键页签（含）之前
  const closeRight = useCallback((target: PageKey) => {
    setOpenTabs((prev) => prev.slice(0, prev.indexOf(target) + 1))
  }, [])
  // 全部关闭：仅留首页
  const closeAll = useCallback(() => {
    setOpenTabs(['dashboard'])
    setCurrentPage('dashboard')
  }, [])

  // 当前页被关闭后回退首页，保证 currentPage 始终在 openTabs 内
  useEffect(() => {
    if (!openTabs.includes(currentPage)) setCurrentPage('dashboard')
  }, [openTabs, currentPage])

  // 右键菜单：点击外部 / 右键非页签区域关闭
  useEffect(() => {
    if (!ctxMenu) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return
      setCtxMenu(null)
    }
    const onCtx = (e: MouseEvent) => {
      const t = e.target as Element
      if (!t.closest('[data-tab-key]')) setCtxMenu(null)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('contextmenu', onCtx)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('contextmenu', onCtx)
    }
  }, [ctxMenu])

  // 滚动条状态（页签溢出时左右按钮可用）
  const updateScrollState = useCallback(() => {
    const el = tabListRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 1)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }, [])
  useEffect(() => {
    updateScrollState()
    const el = tabListRef.current
    if (!el) return
    const ro = new ResizeObserver(updateScrollState)
    ro.observe(el)
    window.addEventListener('resize', updateScrollState)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updateScrollState)
    }
  }, [openTabs, updateScrollState])
  // 激活页签滚动到可视区
  useEffect(() => {
    const el = tabListRef.current
    if (!el) return
    const active = el.querySelector(`[data-tab-key="${currentPage}"]`) as HTMLElement | null
    active?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [currentPage, openTabs])
  const scrollTabs = (dir: number) => {
    tabListRef.current?.scrollBy({ left: dir * 200, behavior: 'smooth' })
  }

  // 右键菜单项渲染
  const renderCtxItem = (icon: React.ReactNode, label: string, disabled: boolean, onClick: () => void) => (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', fontSize: 13,
        cursor: disabled ? 'not-allowed' : 'pointer', color: disabled ? '#bbb' : '#333', borderRadius: 4,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = '#f5f5f5' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      {icon}
      <span>{label}</span>
    </div>
  )

  const { user, logout } = useAuth()
  // 头像加载失败时回退默认图标（避免破损图片）；用户切换时重置
  const [headerAvatarError, setHeaderAvatarError] = useState(false)
  useEffect(() => { setHeaderAvatarError(false) }, [user])
  const { hasMenuPermission, isAdmin } = usePermission()
  const {
    token: { colorBgContainer },
  } = theme.useToken()

  const handleLogout = () => {
    logout()
  }

  // 定义菜单项（按业务模块分组），根据权限动态显示
  // 菜单配置已抽离到 src/config/menuConfig.tsx（God File 优化，审查报告 P2a）
  const menuItems = buildMenuItems(hasMenuPermission, isAdmin)

  // 页面组件映射表（审查 P3-1）：PageKey 与 lazy 组件一一对应，新增页面只需在此登记，
  // 避免 switch 人工同步遗漏；未登记 key 回退 Dashboard。
  const PAGE_COMPONENTS: Record<PageKey, React.LazyExoticComponent<any>> = {
    dashboard: Dashboard,
    users: Users,
    roles: RolePermission,
    expenses: Expenses,
    mood: MoodDiaries,
    weight: WeightRecords,
    notes: Notes,
    novels: Novels,
    novel_comments: NovelComments,
    novel_bookshelves: NovelBookshelves,
    rankings: Rankings,
    bookmarks: Bookmarks,
    annotations: Annotations,
    recommendations: Recommendations,
    tts_management: TtsManagement,
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
    profile: Profile,
  }

  const getPageTitle = () => {
    // 标题映射已抽离到 src/config/pageTitles.ts（God File 优化，审查报告 P2a）
    return PAGE_TITLES[currentPage] || '数据概览'
  }

  return (
    <Layout className={styles.layoutMinH}>
      {/* 固定左侧菜单栏 */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="light"
        className={styles.sider}
      >
        <div className={styles.logoBox}>
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="logo" className={styles.logoImg} />
          {!collapsed && <h2 className={styles.brandTitle}>纯享管理</h2>}
        </div>
        {/* 菜单区域 - 可滚动 */}
        <div className={styles.menuScroll}>
          <Menu
            mode="inline"
            selectedKeys={[currentPage]}
            openKeys={openKeys}
            onOpenChange={(keys) => setOpenKeys(keys.length > 0 ? [String(keys[keys.length - 1])] : [])}
            items={menuItems}
            onClick={({ key }) => openPage(key as PageKey)}
            style={{ borderRight: 0 }}
            inlineCollapsed={collapsed}
          />
        </div>
      </Sider>

      {/* 主内容区域 */}
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s' }}>
        {/* 固定顶部信息栏 */}
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'fixed',
            top: 0,
            left: collapsed ? 80 : 200,
            right: 0,
            zIndex: 99,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            transition: 'left 0.2s',
          }}
        >
          <div className={styles.headerLeft}>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              className: styles.collapseIcon,
              onClick: () => setCollapsed(!collapsed),
            })}
            <h1 className={styles.pageTitle}>
              {getPageTitle()}
            </h1>
          </div>
          <Dropdown
            menu={{
              items: [
                { key: 'profile', icon: <UserOutlined />, label: '个人中心' },
                { type: 'divider', key: 'divider-1' },
                { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
              ],
              onClick: ({ key }) => {
                if (key === 'profile') openPage('profile')
                else if (key === 'logout') handleLogout()
              },
            }}
            placement="bottomRight"
          >
            <div className={styles.userBox}>
              <Avatar
                size={32}
                src={user?.avatar_url && !headerAvatarError ? user.avatar_url : undefined}
                icon={<UserOutlined />}
                onError={() => { setHeaderAvatarError(true); return false }}
                style={{ backgroundColor: (!user?.avatar_url || headerAvatarError) ? '#6C63FF' : 'transparent' }}
              />
              <span className={styles.userText}>
                {user?.nickname || user?.email}
              </span>
              <DownOutlined className={styles.downIcon} />
            </div>
          </Dropdown>
        </Header>

        {/* 内容区域 - 带顶部偏移 + keepalive 页签 */}
        <Content
          className={styles.content}
        >
          <div className={styles.contentInner} style={{ background: colorBgContainer }}>
            <NavigationContext.Provider value={{
              currentPage,
              setCurrentPage: openPage,
            }}>
              {/* 页签栏：左滚动 / 页签列表 / 右滚动（溢出时显示箭头，盒式页签 + 圆角 + 间距） */}
              <div className={styles.tabBar}>
                {canScrollLeft && (
                  <Button type="text" size="small" icon={<LeftOutlined />} onClick={() => scrollTabs(-1)} style={{ flex: '0 0 auto' }} />
                )}
                <div
                  ref={tabListRef}
                  onScroll={updateScrollState}
                  className={styles.tabList}
                >
                  {openTabs.map((k) => {
                    const active = k === currentPage
                    const isHome = k === 'dashboard'
                    return (
                      <div
                        key={k}
                        data-tab-key={k}
                        onClick={() => setCurrentPage(k)}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          setCtxMenu({ x: e.clientX, y: e.clientY, tab: k })
                        }}
                        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#f5f5f5' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                        style={{
                          flex: '0 0 auto',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          height: 32,
                          padding: '0 12px',
                          marginRight: 6,
                          marginBottom: -1,
                          cursor: 'pointer',
                          userSelect: 'none',
                          fontSize: 13,
                          color: '#555',
                          fontWeight: active ? 600 : 400,
                          // 盒式圆角页签：选中页签底部线为空，覆盖贯穿线以联动内容区
                          border: '1px solid #e8e8e8',
                          borderBottomColor: active ? colorBgContainer : '#e8e8e8',
                          borderRadius: '6px 6px 0 0',
                          background: active ? colorBgContainer : 'transparent',
                        }}
                      >
                        <span>{PAGE_TITLES[k] || '未命名'}</span>
                        {!isHome && (
                          <CloseOutlined
                            style={{ fontSize: 10, opacity: 0.55 }}
                            onClick={(e) => { e.stopPropagation(); closeTab(k) }}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
                {canScrollRight && (
                  <Button type="text" size="small" icon={<RightOutlined />} onClick={() => scrollTabs(1)} style={{ flex: '0 0 auto' }} />
                )}
              </div>

              {/* 页签内容（keepalive：非活动页签仅 display:none 隐藏，组件实例保留不重挂载） */}
              <div className={common.mt8}>
                {openTabs.map((k) => (
                  <div
                    key={`${k}:${refreshKeys[k] ?? 0}`}
                    style={{ display: k === currentPage ? 'block' : 'none' }}
                  >
                    <ErrorBoundary>
                      <Suspense fallback={<div className={styles.loadingBox}><Spin size="large" /></div>}>
                        {React.createElement(PAGE_COMPONENTS[k])}
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                ))}
              </div>

              {/* 右键上下文菜单（首页 dashboard 排除在关闭操作之外） */}
              {ctxMenu && (() => {
                const othersCount = openTabs.filter((t) => t !== 'dashboard' && t !== ctxMenu.tab).length
                const rightIdx = openTabs.indexOf(ctxMenu.tab)
                return (
                  <div
                    ref={menuRef}
                    style={{ position: 'fixed', top: ctxMenu.y, left: ctxMenu.x, zIndex: 1100, minWidth: 150, background: '#fff', border: '1px solid #f0f0f0', borderRadius: 6, boxShadow: '0 6px 16px rgba(0,0,0,0.12)', padding: 4 }}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    {renderCtxItem(<ReloadOutlined />, '刷新页面', false, () => { setCurrentPage(ctxMenu.tab); refreshTab(ctxMenu.tab); setCtxMenu(null) })}
                    <div className={styles.ctxDivider} />
                    {renderCtxItem(<CloseOutlined />, '关闭当前', ctxMenu.tab === 'dashboard', () => { closeTab(ctxMenu.tab); setCtxMenu(null) })}
                    {renderCtxItem(<CloseOutlined />, '关闭其他', othersCount === 0, () => { closeOthers(ctxMenu.tab); setCtxMenu(null) })}
                    {renderCtxItem(<CloseOutlined />, '关闭右侧页签', rightIdx >= openTabs.length - 1, () => { closeRight(ctxMenu.tab); setCtxMenu(null) })}
                    {renderCtxItem(<CloseOutlined />, '全部关闭', openTabs.length <= 1, () => { closeAll(); setCtxMenu(null) })}
                  </div>
                )
              })()}
            </NavigationContext.Provider>
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

// ========== App (最外层用 InlineAuthProvider 包裹) ==========
const App: React.FC = () => {
  return (
    <InlineAuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <AuthGuard>
              <MainLayout />
            </AuthGuard>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </InlineAuthProvider>
  )
}

export default App
