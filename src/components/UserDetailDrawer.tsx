import React from 'react'
import {
  Drawer,
  Descriptions,
  Tag,
  Avatar,
  Divider,
  Typography,
  Empty,
  Spin,
  Statistic,
  Row,
  Col,
  Timeline,
} from 'antd'
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  TrophyOutlined,
  LoginOutlined,
} from '@ant-design/icons'
import type { User, UserStats, OperationLog } from '../types/user'
import {
  USER_ROLE_LABELS,
  USER_ROLE_COLORS,
  MEMBER_LEVEL_LABELS,
  MEMBER_LEVEL_COLORS,
  USER_STATUS_LABELS,
  USER_STATUS_COLORS,
} from '../types/user'
import dayjs from 'dayjs'

const { Text, Title } = Typography

interface UserDetailDrawerProps {
  open: boolean
  user: User | null
  stats?: UserStats | null
  logs?: OperationLog[]
  loading?: boolean
  onClose: () => void
}

const UserDetailDrawer: React.FC<UserDetailDrawerProps> = ({
  open,
  user,
  stats,
  logs = [],
  loading = false,
  onClose,
}) => {
  if (!user) return null

  return (
    <Drawer
      title="用户详情"
      placement="right"
      width={600}
      onClose={onClose}
      open={open}
    >
      <Spin spinning={loading}>
        {/* 用户头像和基本信息 */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Avatar
            size={80}
            src={user.avatar_url}
            icon={<UserOutlined />}
            style={{ marginBottom: 12 }}
          />
          <Title level={4} style={{ margin: 0 }}>
            {user.nickname || '未设置昵称'}
          </Title>
          <Text type="secondary">{user.email}</Text>
        </div>

        {/* 状态标签 */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Tag color={USER_ROLE_COLORS[user.role]} style={{ marginRight: 8 }}>
            {USER_ROLE_LABELS[user.role]}
          </Tag>
          <Tag color={MEMBER_LEVEL_COLORS[user.member_level]} style={{ marginRight: 8 }}>
            {MEMBER_LEVEL_LABELS[user.member_level]}
          </Tag>
          <Tag color={USER_STATUS_COLORS[user.status]}>
            {USER_STATUS_LABELS[user.status]}
          </Tag>
        </div>

        <Divider />

        {/* 基本信息 */}
        <Title level={5}>
          <UserOutlined style={{ marginRight: 8 }} />
          基本信息
        </Title>
        <Descriptions column={2} size="small" bordered>
          <Descriptions.Item label="用户ID" span={2}>
            <Text copyable style={{ fontSize: 12 }}>
              {user.id}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="邮箱">
            <MailOutlined style={{ marginRight: 4 }} />
            {user.email}
          </Descriptions.Item>
          <Descriptions.Item label="手机号">
            {user.phone ? (
              <>
                <PhoneOutlined style={{ marginRight: 4 }} />
                {user.phone}
              </>
            ) : (
              <Text type="secondary">未绑定</Text>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="积分">
            <TrophyOutlined style={{ marginRight: 4, color: '#faad14' }} />
            <Text strong>{user.points}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="登录次数">
            <LoginOutlined style={{ marginRight: 4 }} />
            {user.login_count} 次
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        {/* 登录信息 */}
        <Title level={5}>
          <ClockCircleOutlined style={{ marginRight: 8 }} />
          登录信息
        </Title>
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="注册时间">
            {dayjs(user.created_at).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="注册IP">
            {user.register_ip ? (
              <>
                <EnvironmentOutlined style={{ marginRight: 4 }} />
                {user.register_ip}
              </>
            ) : (
              <Text type="secondary">未知</Text>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="最后登录时间">
            {user.last_login_at
              ? dayjs(user.last_login_at).format('YYYY-MM-DD HH:mm:ss')
              : <Text type="secondary">从未登录</Text>}
          </Descriptions.Item>
          <Descriptions.Item label="最后登录IP">
            {user.last_login_ip ? (
              <>
                <EnvironmentOutlined style={{ marginRight: 4 }} />
                {user.last_login_ip}
              </>
            ) : (
              <Text type="secondary">未知</Text>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {dayjs(user.updated_at).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        {/* 数据统计 */}
        <Title level={5}>
          <TrophyOutlined style={{ marginRight: 8 }} />
          数据统计
        </Title>
        {stats ? (
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title="消费记录"
                value={stats.expense_count}
                suffix="条"
                valueStyle={{ color: '#6C63FF' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="心情日记"
                value={stats.mood_count}
                suffix="篇"
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="体重记录"
                value={stats.weight_count}
                suffix="条"
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="笔记"
                value={stats.note_count}
                suffix="篇"
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="书架小说"
                value={stats.novel_count}
                suffix="本"
                valueStyle={{ color: '#722ed1' }}
              />
            </Col>
          </Row>
        ) : (
          <Empty description="暂无统计数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}

        <Divider />

        {/* 操作日志 */}
        <Title level={5}>
          <ClockCircleOutlined style={{ marginRight: 8 }} />
          最近操作
        </Title>
        {logs && logs.length > 0 ? (
          <Timeline
            items={logs.slice(0, 10).map(log => ({
              color: 'blue',
              children: (
                <div>
                  <div>
                    <Text strong>{log.action}</Text>
                    <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                      {dayjs(log.created_at).format('MM-DD HH:mm')}
                    </Text>
                  </div>
                  {log.details && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {JSON.stringify(log.details)}
                    </Text>
                  )}
                  {log.ip && (
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                      IP: {log.ip}
                    </Text>
                  )}
                </div>
              ),
            }))}
          />
        ) : (
          <Empty description="暂无操作记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Spin>
    </Drawer>
  )
}

export default UserDetailDrawer
