// 主布局：左侧菜单 + 固定顶栏（折叠按钮/keepalive 页签/用户区）+ 内容区 + 页签右键菜单
// 页面懒加载注册见 config/pageComponents，菜单配置见 config/menuConfig。
import React, { useState, useCallback, useEffect, useRef, Suspense } from 'react'
import { Layout, Menu, theme, Avatar, Dropdown, Button, Spin } from 'antd'
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
import { useAuth } from '../../contexts/AuthContext'
import { NavigationContext, type PageKey, type PageNavSignal } from '../../contexts/NavigationContext'
import { usePermission } from '../../hooks/usePermission'
import ErrorBoundary from '../common/ErrorBoundary'
import { PAGE_COMPONENTS } from '../../config/pageComponents'
import { buildMenuItems } from '../../config/menuConfig'
import { PAGE_TITLES } from '../../config/pageTitles'
import styles from './index.module.css'
import common from '../../styles/common.module.css'

const { Header, Sider, Content } = Layout

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [openKeys, setOpenKeys] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard')
  // 已打开页签（keepalive）：默认含仪表盘，切换 / 跳转页面时追加，关闭页签时移除（仅当前会话，不持久化到 sessionStorage）
  const [openTabs, setOpenTabs] = useState<PageKey[]>(['dashboard'])
  // 统一跳转入口：激活页签 + 按需追加到已打开列表（供侧边菜单与子页面 useNavigation 复用，实现不刷新切换）
  // params 非空时记录导航参数信号（seq 递增），供目标页感知深链定位（keepalive 下组件不重挂载）
  const [pageParams, setPageParamsState] = useState<Record<string, PageNavSignal>>({})
  const openPage = useCallback((page: PageKey, params?: Record<string, unknown>) => {
    setCurrentPage(page)
    setPageParamsState((prev) => {
      if (params) {
        return { ...prev, [page]: { seq: Date.now(), data: params } }
      }
      // 无参跳转清除该页残留信号：信号只在「最近一次进入该页带参」时存在，
      // 防止目标页（keepalive 复用或关闭后重开）误消费过期的深链参数
      if (!(page in prev)) return prev
      const next = { ...prev }
      delete next[page]
      return next
    })
    setOpenTabs((prev) => (prev.includes(page) ? prev : [...prev, page]))
  }, [])

  // ========== 页签增强：刷新 / 关闭 / 右键菜单 ==========
  const [refreshKeys, setRefreshKeys] = useState<Record<string, number>>({})
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; tab: PageKey } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // 页签横向滚动：左右滑动按钮全状态常驻，通过 disabled 表达"无可滚动内容"，
  // 避免触底消失导致点击穿透到页签；未溢出时两者均禁用。
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
  // 仅判断是否溢出：滚动按钮在溢出时一直展示，不随触底消失，杜绝点击穿透
  const updateScrollState = useCallback(() => {
    const el = tabListRef.current
    if (!el) return
    // 左按钮：scrollLeft > 0 时启用；右按钮：未到最右时启用；未溢出时 scrollLeft=0 且 scrollWidth===clientWidth，两者均禁用
    setCanScrollLeft(el.scrollLeft > 0)
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
        {/* 固定顶部信息栏：左侧折叠按钮 + 页签（替换原菜单名称），右侧用户区 */}
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
            <span
              className={styles.collapseWrap}
            >
              {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
                className: styles.collapseIcon,
                onClick: () => setCollapsed(!collapsed),
              })}
            </span>
            {/* 页签栏：antd 卡片式页签（左上右上圆角 + 菜单间距 + 底部贯穿线）；
                flex 占满 Header 左侧折叠按钮与右侧用户区之间的全部空间，贯穿线随容器铺满；
                选中页签底边框/背景传 colorBgContainer 主题 token，露出贯穿线作为选中标识；
                左右滑动按钮全状态常驻，通过 disabled 表达"无可滚动内容"（避免点击穿透到页签） */}
            <div
              className={styles.tabBar}
            >
              <Button
                type="text"
                size="small"
                icon={<LeftOutlined />}
                onClick={() => scrollTabs(-1)}
                disabled={!canScrollLeft}
                style={{ flex: '0 0 auto' }}
              />
              <div
                ref={tabListRef}
                className={styles.tabList}
                onScroll={updateScrollState}
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
                      className={styles.tab}
                      style={active ? {
                        // 主题 token（colorBgContainer）保留 inline：选中页签底边框与背景与内容区同色，
                        // 让底部贯穿线透出作为选中标识
                        borderBottomColor: colorBgContainer,
                        background: colorBgContainer,
                      } : undefined}
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
              <Button
                type="text"
                size="small"
                icon={<RightOutlined />}
                onClick={() => scrollTabs(1)}
                disabled={!canScrollRight}
                style={{ flex: '0 0 auto' }}
              />
            </div>
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
              pageParams,
            }}>
              {/* 页签栏已上移至 Header（与菜单名称合并），此处仅渲染内容 */}
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

export default MainLayout
