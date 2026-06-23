import React, { useState } from 'react'
import { Card, Form, Input, Button, message, Typography } from 'antd'
import { UserOutlined, LockOutlined } from '@ant/icons'
import { supabase } from '../utils/supabase'

const { Title, Text } = Typography

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false)

  const handleLogin = async (values: { username: string; password: string }) => {
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

      // 从 user_metadata 中获取角色信息
      const role = authData.user.user_metadata?.role as string

      // 检查角色权限
      if (!['admin', 'super_admin'].includes(role)) {
        // 角色不匹配，登出并提示
        await supabase.auth.signOut()
        throw new Error('该用户无权登录管理后台')
      }

      message.success('登录成功')
      // 刷新页面让 AuthGuard 读取新的会话状态
      window.location.href = '/pure-enjoy-admin/'
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '登录失败'
      message.error(errorMessage)
      if (process.env.NODE_ENV === 'development') {
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
