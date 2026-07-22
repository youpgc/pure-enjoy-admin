import React, { useState } from 'react'
import { Card, Form, Input, Button, message, Typography } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { supabase } from '../utils/supabase'
import { ADMIN_ROLE_CODES } from '../constants'

const { Title, Text } = Typography

// 记录一次后台登录事件（best-effort，不阻塞登录流程）
// 前端解析 GeoIP 地点，真实客户端 IP 由服务端 RPC 从 request.headers 提取
async function recordAdminLogin(username: string, success: boolean) {
  let location: string | undefined
  try {
    const res = await fetch('https://ipapi.co/json/')
    if (res.ok) {
      const j = (await res.json()) as Record<string, unknown>
      location = [j['country_name'], j['region'], j['city']]
        .filter((v) => v != null && `${v}`.trim() !== '')
        .join(' ')
      if (location === '') location = undefined
    }
  } catch {
    location = undefined
  }
  try {
    await supabase.rpc('record_login', {
      p_source: 'admin',
      p_status: success ? 'success' : 'failed',
      p_user_agent: navigator.userAgent,
      p_location: location,
      p_username: username,
    } as any)
  } catch {
    // 记录失败不影响登录主流程
  }
}

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false)

  const handleLogin = async (values: { username: string; password: string }) => {
    if (loading) return
    setLoading(true)
    try {
      // 使用 Supabase Auth 进行登录
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: values.username,
        password: values.password,
      })

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('用户名或密码错误')
        }
        throw new Error(authError.message)
      }

      if (!authData.user) {
        throw new Error('登录失败，未获取到用户信息')
      }

      // 从 user_metadata 或 app_metadata 中获取角色信息
      // 优先读取 user_metadata.role（自定义管理员角色），其次 app_metadata.role（Supabase 默认角色）
      const userMetadata = authData.user.user_metadata || {}
      const appMetadata = authData.user.app_metadata || {}
      const role = (userMetadata.role || appMetadata.role || '') as string

      // 检查角色权限
      if (!(ADMIN_ROLE_CODES as readonly string[]).includes(role)) {
        // 角色不匹配，登出并提示
        await supabase.auth.signOut()
        throw new Error('该用户无权登录管理后台')
      }

      message.success('登录成功')
      // 记录登录成功日志（等待写入后再跳转，确保审计完整）
      await recordAdminLogin(values.username, true)
      // 刷新页面让 AuthGuard 读取新的会话状态
      window.location.href = '/pure-enjoy-admin/'
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '登录失败'
      message.error(errorMessage)
      // 记录登录失败日志（best-effort）
      recordAdminLogin(values.username, false).catch(() => {})
      if (import.meta.env.DEV) {
        console.error('[Login] 登录失败:', err)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <Card className="login-card">
        <div className="login-logo">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="logo" style={{ width: 64, height: 64, marginBottom: 12 }} />
          <Title level={2} style={{ color: '#6C63FF', marginBottom: 8 }}>
            纯享管理后台
          </Title>
          <Text type="secondary">Pure Enjoy Admin Dashboard</Text>
        </div>

        <Form
          name="login"
          onFinish={handleLogin}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名/邮箱" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default Login
