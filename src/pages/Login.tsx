import React, { useState } from 'react'
import { Card, Form, Input, Button, message, Typography } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { supabase } from '../utils/supabase'

const { Title, Text } = Typography

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false)

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      // 直接查询 admin_users 表
      // eslint-disable-next-line no-template-curly-in-string
      const { data: users, error } = await supabase
        .from(`admin${'\x5f'}users`)
        .select('*')
        .eq('email', values.username)

      if (error) {
        console.error('[Login] 查询失败:', error)
        throw new Error('登录失败，请稍后重试')
      }

      if (!users || users.length === 0) {
        throw new Error('用户不存在')
      }

      const user = users[0]

      // 明文密码比较
      if (user.password !== values.password) {
        throw new Error('用户名或密码错误')
      }

      // 检查角色
      if (!['admin', 'super_admin'].includes(user.role)) {
        throw new Error('该用户无权登录管理后台')
      }

      // 存储用户信息
      const adminUser = {
        id: String(user.id),
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      }

      localStorage.setItem('admin_user', JSON.stringify(adminUser))

      message.success('登录成功')
      // 刷新页面让 AuthGuard 读取新的 localStorage
      window.location.href = '/pure-enjoy-admin/'
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '登录失败'
      message.error(errorMessage)
      console.error('[Login] 登录失败:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <Card className="login-card">
        <div className="login-logo">
          <img src="/logo.png" alt="logo" style={{ width: 64, height: 64, marginBottom: 12 }} />
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
            <Input prefix={<UserOutlined />} placeholder="用户名" />
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
