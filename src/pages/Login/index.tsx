import React, { useState } from 'react'
import { Card, Form, Input, Button, message, Typography } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { loginAdmin } from '../../utils/adminSession'
import styles from './index.module.css'

const { Title, Text } = Typography

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false)

  const handleLogin = async (values: { username: string; password: string }) => {
    if (loading) return
    setLoading(true)
    try {
      // 本地后端为管理会话唯一权威源：realm=admin 登录（服务端校验 admin_users + 角色白名单，
      // 并在服务端写 login_logs），JWT 含双 realm 隔离声明，权限由 /auth/me 服务端实时下发。
      // Supabase 依赖已完全移除，登录不再触碰任何 Supabase 接口。
      await loginAdmin(values.username, values.password)

      message.success('登录成功')
      // 刷新页面让 AuthGuard 读取新的会话状态
      window.location.href = '/pure-enjoy-admin/'
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '登录失败'
      message.error(errorMessage)
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
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="logo" className={styles.logoImg} />
          <Title level={2} className={styles.logoTitle}>
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
