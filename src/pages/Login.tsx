import React, { useState } from 'react'
import { Form, Input, Button, Card, Alert, Typography, Space } from 'antd'
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons'
import { useAuth } from '../context/auth'
import { ROLE_DISPLAY_NAMES } from '../types/auth'

const { Title, Text } = Typography

const Login: React.FC = () => {
  const [form] = Form.useForm()
  const { login, error, isLoading } = useAuth()
  const [loginError, setLoginError] = useState<string | null>(null)

  const handleSubmit = async (values: { email: string; password: string }) => {
    setLoginError(null)
    const success = await login({
      email: values.email,
      password: values.password,
    })
    if (!success) {
      setLoginError(error || '登录失败')
    }
  }

  return (
    <div className="login-container">
      <Card className="login-box">
        <div className="login-logo">
          <Title level={2} style={{ color: '#6C63FF', margin: 0 }}>
            纯享管理后台
          </Title>
          <Text type="secondary">Pure Enjoy Admin</Text>
        </div>

        {loginError && (
          <Alert
            message={loginError}
            type="error"
            showIcon
            style={{ marginBottom: 24 }}
            closable
            onClose={() => setLoginError(null)}
          />
        )}

        <Form
          form={form}
          name="login"
          onFinish={handleSubmit}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="邮箱"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="密码"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              block
              icon={<LoginOutlined />}
              size="large"
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div style={{ marginTop: 24 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            测试账号：
          </Text>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Card size="small" style={{ background: '#f6ffed' }}>
              <Space>
                <Text strong>超级管理员：</Text>
                <Text code copyable>admin@pureenjoy.com</Text>
                <Text type="secondary">密码：admin123</Text>
              </Space>
            </Card>
            <Card size="small" style={{ background: '#e6f7ff' }}>
              <Space>
                <Text strong>管理员：</Text>
                <Text code copyable>manager@pureenjoy.com</Text>
                <Text type="secondary">密码：manager123</Text>
              </Space>
            </Card>
            <Card size="small" style={{ background: '#fff7e6' }}>
              <Space>
                <Text strong>查看者：</Text>
                <Text code copyable>viewer@pureenjoy.com</Text>
                <Text type="secondary">密码：viewer123</Text>
              </Space>
            </Card>
          </Space>
        </div>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            不同角色拥有不同的操作权限，请使用对应的账号登录
          </Text>
        </div>
      </Card>
    </div>
  )
}

export default Login
