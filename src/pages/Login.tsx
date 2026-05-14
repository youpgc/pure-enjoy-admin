import React, { useState } from 'react'
import { Card, Form, Input, Button, message, Typography } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth'

const { Title, Text } = Typography

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true)
    try {
      await login(values.email, values.password)
      message.success('登录成功')
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '登录失败'
      message.error(errorMessage)
    }
    setLoading(false)
  }

  return (
    <div className="login-container">
      <Card className="login-card">
        <div className="login-logo">
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
            name="email"
            rules={[{ required: true, message: '请输入邮箱' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="邮箱" />
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

        <div className="login-test-info">
          <div style={{ marginBottom: 4, fontWeight: 'bold' }}>测试账号：</div>
          <div>超级管理员：admin@pure.enjoy / admin123</div>
          <div>管理员：manager@pure.enjoy / manager123</div>
          <div>查看者：viewer@pure.enjoy / viewer123</div>
        </div>
      </Card>
    </div>
  )
}

export default Login
