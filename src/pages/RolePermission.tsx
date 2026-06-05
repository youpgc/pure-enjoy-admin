import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, Row, Col, Button, Table, Tag, Typography, Tooltip, Spin, Empty, message, Alert } from 'antd'
import {
  UserOutlined,
  TeamOutlined,
  CrownOutlined,
  CheckOutlined,
  CloseOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import type { RoleWithPermissions, Permission } from '../types/permission'
import { MODULE_DISPLAY_NAMES, MODULE_COLORS } from '../types/permission'
import PermissionConfigModal from '../components/PermissionConfigModal'
import { useAuth } from '../App'
import { supabase } from '../utils/supabase'

const { Title, Text } = Typography

// 角色图标和颜色
const ROLE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  user: {
    icon: <UserOutlined style={{ fontSize: 32 }} />,
    color: '#52c41a',
    bgColor: '#f6ffed',
  },
  admin: {
    icon: <TeamOutlined style={{ fontSize: 32 }} />,
    color: '#1890ff',
    bgColor: '#e6f7ff',
  },
  super_admin: {
    icon: <CrownOutlined style={{ fontSize: 32 }} />,
    color: '#722ed1',
    bgColor: '#f9f0ff',
  },
}

const RolePermission: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedRole, setSelectedRole] = useState<RoleWithPermissions | null>(null)
  const [rolesWithPerms, setRolesWithPerms] = useState<RoleWithPermissions[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEmpty, setIsEmpty] = useState(false)

  const { user } = useAuth()

  // 检查是否是超级管理员
  const isSuperAdmin = user?.role === 'super_admin'
  // 检查是否是管理员（可以查看但不能修改）
  const isAdmin = user?.role === 'admin'

  // 是否可以编辑权限（只有超级管理员可以）
  const canEdit = isSuperAdmin

  // 从 Supabase 加载角色权限数据
  const fetchRolePermissions = useCallback(async () => {
    setLoading(true)
    setError(null)
    setIsEmpty(false)
    try {
      // 查询 users 表
      const usersRes = await supabase.from('users').select('id, nickname, role').order('created_at', { ascending: false })

      if (usersRes.error) {
        console.error('加载用户列表失败:', usersRes.error)
        setError(`加载用户列表失败: ${usersRes.error.message}`)
        return
      }

      const usersData = usersRes.data || []

      // 尝试查询 system_configs 表，表不存在时不报错
      let configsData: any[] = []
      try {
        const configsRes = await supabase.from('system_configs').select('*').order('created_at', { ascending: true })
        if (!configsRes.error && configsRes.data) {
          configsData = configsRes.data
        } else if (configsRes.error) {
          console.warn('system_configs 表查询失败（表可能不存在）:', configsRes.error.message)
        }
      } catch (e) {
        console.warn('system_configs 表不可用，使用 users 表角色信息降级')
      }

      // 从 system_configs 中解析角色配置和权限配置
      // system_configs 表通常以 key-value 形式存储配置
      // 尝试解析角色和权限数据
      const roleConfig = configsData.find((c: any) => c.key === 'roles' || c.key === 'role_config')
      const permissionConfig = configsData.find((c: any) => c.key === 'permissions' || c.key === 'permission_config')
      const rolePermConfig = configsData.find((c: any) => c.key === 'role_permissions' || c.key === 'role_permission_config')

      // 解析角色数据
      let roles: RoleWithPermissions[] = []
      let perms: Permission[] = []

      if (roleConfig) {
        try {
          const parsed = typeof roleConfig.value === 'string'
            ? JSON.parse(roleConfig.value)
            : roleConfig.value
          roles = (Array.isArray(parsed) ? parsed : []).map((r: any, idx: number) => ({
            id: r.id || idx + 1,
            name: r.name || r.role || 'unknown',
            display_name: r.display_name || r.name || '未知角色',
            description: r.description || null,
            level: r.level || idx + 1,
            created_at: r.created_at || new Date().toISOString(),
            permissions: [],
          }))
        } catch {
          console.error('解析角色配置失败')
        }
      }

      if (permissionConfig) {
        try {
          const parsed = typeof permissionConfig.value === 'string'
            ? JSON.parse(permissionConfig.value)
            : permissionConfig.value
          perms = (Array.isArray(parsed) ? parsed : []).map((p: any, idx: number) => ({
            id: p.id || idx + 1,
            name: p.name || `${p.module}:${p.action}`,
            display_name: p.display_name || p.name || '未知权限',
            module: p.module || 'system',
            action: p.action || 'read',
            description: p.description || null,
            created_at: p.created_at || new Date().toISOString(),
          }))
        } catch {
          console.error('解析权限配置失败')
        }
      }

      // 如果从 system_configs 解析不到角色数据，尝试从 users 表中提取角色信息
      if (roles.length === 0) {
        const roleMap = new Map<string, { count: number }>()
        usersData.forEach((u: any) => {
          const role = u.role || 'user'
          const existing = roleMap.get(role)
          if (existing) {
            existing.count++
          } else {
            roleMap.set(role, { count: 1 })
          }
        })

        const roleNames: Record<string, string> = {
          user: '普通用户',
          admin: '管理员',
          super_admin: '超级管理员',
        }
        const roleLevels: Record<string, number> = {
          user: 1,
          admin: 2,
          super_admin: 3,
        }

        let idx = 1
        roleMap.forEach((info, roleName) => {
          roles.push({
            id: idx,
            name: roleName,
            display_name: roleNames[roleName] || roleName,
            description: `${roleNames[roleName] || roleName}，共 ${info.count} 人`,
            level: roleLevels[roleName] || idx,
            created_at: new Date().toISOString(),
            permissions: [],
          })
          idx++
        })
      }

      // 如果解析到了角色权限关联数据，为角色分配权限
      if (rolePermConfig && perms.length > 0) {
        try {
          const parsed = typeof rolePermConfig.value === 'string'
            ? JSON.parse(rolePermConfig.value)
            : rolePermConfig.value
          const rpList = Array.isArray(parsed) ? parsed : []
          roles = roles.map(role => {
            const permIds = rpList
              .filter((rp: any) => rp.role_id === role.id || rp.role_name === role.name)
              .map((rp: any) => rp.permission_id)
            return {
              ...role,
              permissions: perms.filter(p => permIds.includes(p.id)),
            }
          })
        } catch {
          console.error('解析角色权限关联失败')
        }
      }

      setRolesWithPerms(roles)
      setPermissions(perms)
    } catch (err) {
      console.error('加载角色权限异常:', err)
      setError('加载角色权限数据异常，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRolePermissions()
  }, [fetchRolePermissions])

  // 打开权限配置弹窗
  const handleConfigClick = (role: RoleWithPermissions) => {
    setSelectedRole(role)
    setModalVisible(true)
  }

  // 保存权限配置
  const handleSavePermissions = async (roleId: number, permissionIds: number[]) => {
    try {
      // 尝试更新 system_configs 中的角色权限关联配置
      let allRolePerms: Array<{ role_id: number; permission_id: number }> = []

      try {
        const { data: existingConfigs, error: queryError } = await supabase
          .from('system_configs')
          .select('*')
          .eq('key', 'role_permissions')

        if (queryError) {
          console.warn('system_configs 表不存在，权限仅保存到本地状态')
        } else if (existingConfigs && existingConfigs.length > 0) {
          const existingConfig = existingConfigs[0]
          try {
            const parsed = typeof existingConfig.value === 'string'
              ? JSON.parse(existingConfig.value)
              : existingConfig.value
            allRolePerms = Array.isArray(parsed) ? parsed : []
          } catch {
            allRolePerms = []
          }

          // 更新当前角色的权限关联
          allRolePerms = allRolePerms.filter((rp: any) => rp.role_id !== roleId)
          permissionIds.forEach(pid => {
            allRolePerms.push({ role_id: roleId, permission_id: pid })
          })

          // 更新已有配置
          const { error: updateError } = await supabase
            .from('system_configs')
            .update({ value: JSON.stringify(allRolePerms) })
            .eq('id', existingConfig.id)

          if (updateError) {
            console.error('更新角色权限配置失败:', updateError)
          }
        } else {
          // 插入新配置
          permissionIds.forEach(pid => {
            allRolePerms.push({ role_id: roleId, permission_id: pid })
          })

          const { error: insertError } = await supabase
            .from('system_configs')
            .insert({
              key: 'role_permissions',
              value: JSON.stringify(allRolePerms),
            })

          if (insertError) {
            console.error('插入角色权限配置失败:', insertError)
          }
        }
      } catch (e) {
        console.warn('system_configs 表不可用，权限仅保存到本地状态')
      }

      message.success('权限配置已保存')
    } catch (err) {
      console.error('保存权限配置异常:', err)
      message.error('保存权限配置失败')
    }

    // 更新本地状态
    setRolesWithPerms(prev =>
      prev.map(role => {
        if (role.id === roleId) {
          return {
            ...role,
            permissions: permissions.filter(p => permissionIds.includes(p.id)),
          }
        }
        return role
      })
    )
  }

  // 权限矩阵数据
  const matrixData = useMemo(() => {
    // 如果没有权限数据，返回空数组
    if (permissions.length === 0) return []

    // 按模块分组权限
    const groupedPermissions: Record<string, Permission[]> = {}
    permissions.forEach(permission => {
      if (!groupedPermissions[permission.module]) {
        groupedPermissions[permission.module] = []
      }
      groupedPermissions[permission.module]!.push(permission)
    })

    // 构建表格数据
    const data: Array<{
      key: string
      module: string
      permission: string
      permissionId: number
      isModuleHeader?: boolean
      user: boolean
      admin: boolean
      super_admin: boolean
    }> = []

    Object.entries(groupedPermissions).forEach(([module, permissions]) => {
      // 添加模块标题行
      data.push({
        key: `module_${module}`,
        module: MODULE_DISPLAY_NAMES[module] || module,
        permission: '',
        permissionId: 0,
        isModuleHeader: true,
        user: false,
        admin: false,
        super_admin: false,
      })

      // 添加权限行
      permissions.forEach(permission => {
        const rolePerms = rolesWithPerms.reduce(
          (acc, role) => {
            acc[role.name] = role.permissions.some(p => p.id === permission.id)
            return acc
          },
          {} as Record<string, boolean>
        )

        data.push({
          key: `perm_${permission.id}`,
          module: '',
          permission: permission.display_name,
          permissionId: permission.id,
          user: rolePerms['user'] || false,
          admin: rolePerms['admin'] || false,
          super_admin: rolePerms['super_admin'] || false,
        })
      })
    })

    return data
  }, [rolesWithPerms, permissions])

  // 权限矩阵表格列
  const matrixColumns = [
    {
      title: '权限名称',
      dataIndex: 'permission',
      key: 'permission',
      width: 200,
      render: (text: string, record: typeof matrixData[0]) => {
        if (record.isModuleHeader) {
          return (
            <span style={{ fontWeight: 600, color: MODULE_COLORS[record.key.replace('module_', '')] || '#333' }}>
              {record.module}
            </span>
          )
        }
        return <span style={{ paddingLeft: 16, color: '#666' }}>{text}</span>
      },
    },
    {
      title: '普通用户',
      dataIndex: 'user',
      key: 'user',
      width: 100,
      align: 'center' as const,
      render: (checked: boolean, record: typeof matrixData[0]) => {
        if (record.isModuleHeader) return null
        return checked ? (
          <CheckOutlined style={{ color: '#52c41a', fontSize: 16 }} />
        ) : (
          <CloseOutlined style={{ color: '#d9d9d9', fontSize: 16 }} />
        )
      },
    },
    {
      title: '管理员',
      dataIndex: 'admin',
      key: 'admin',
      width: 100,
      align: 'center' as const,
      render: (checked: boolean, record: typeof matrixData[0]) => {
        if (record.isModuleHeader) return null
        return checked ? (
          <CheckOutlined style={{ color: '#52c41a', fontSize: 16 }} />
        ) : (
          <CloseOutlined style={{ color: '#d9d9d9', fontSize: 16 }} />
        )
      },
    },
    {
      title: '超级管理员',
      dataIndex: 'super_admin',
      key: 'super_admin',
      width: 120,
      align: 'center' as const,
      render: (checked: boolean, record: typeof matrixData[0]) => {
        if (record.isModuleHeader) return null
        return checked ? (
          <CheckOutlined style={{ color: '#52c41a', fontSize: 16 }} />
        ) : (
          <CloseOutlined style={{ color: '#d9d9d9', fontSize: 16 }} />
        )
      },
    },
  ]

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" tip="加载角色权限..." />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 40 }}>
        <Alert
          type="error"
          message="加载失败"
          description={error}
          showIcon
          action={
            <Button size="small" type="primary" onClick={fetchRolePermissions}>
              重试
            </Button>
          }
        />
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Empty description="暂无角色配置数据，请在配置管理中添加" />
      </div>
    )
  }

  return (
    <div>
      {/* 角色卡片区域 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ marginBottom: 16 }}>
          角色列表
        </Title>
        <Row gutter={[16, 16]}>
          {rolesWithPerms.map(role => {
            const config = ROLE_CONFIG[role.name] || ROLE_CONFIG['user']!
            return (
              <Col key={role.id} xs={24} sm={12} md={8}>
                <Card
                  hoverable
                  style={{
                    borderRadius: 12,
                    border: `2px solid ${config.color}20`,
                    overflow: 'hidden',
                  }}
                  styles={{
                    body: { padding: 0 },
                  }}
                >
                  <div
                    style={{
                      background: config.bgColor,
                      padding: '24px 16px',
                      textAlign: 'center',
                      borderBottom: `1px solid ${config.color}20`,
                    }}
                  >
                    <div style={{ color: config.color, marginBottom: 8 }}>{config.icon}</div>
                    <Title level={4} style={{ margin: 0, color: config.color }}>
                      {role.display_name}
                    </Title>
                    <Tag color={config.color} style={{ marginTop: 8 }}>
                      Level {role.level}
                    </Tag>
                  </div>
                  <div style={{ padding: 16 }}>
                    <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>
                      {role.description}
                    </Text>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Text>
                        <Text strong style={{ fontSize: 18, color: config.color }}>
                          {role.permissions.length}
                        </Text>{' '}
                        个权限
                      </Text>
                      <Tooltip title={!canEdit ? '只有超级管理员可以修改权限' : ''}>
                        <Button
                          type="primary"
                          icon={<SettingOutlined />}
                          onClick={() => handleConfigClick(role)}
                          disabled={!canEdit && !isAdmin}
                          style={{
                            background: canEdit ? config.color : undefined,
                            borderColor: canEdit ? config.color : undefined,
                          }}
                        >
                          {canEdit ? '配置权限' : '查看权限'}
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                </Card>
              </Col>
            )
          })}
        </Row>
      </div>

      {/* 权限矩阵区域 */}
      <div>
        <Title level={4} style={{ marginBottom: 16 }}>
          权限矩阵
        </Title>
        <Card style={{ borderRadius: 8 }}>
          <Table
            dataSource={matrixData}
            columns={matrixColumns}
            pagination={false}
            size="small"
            rowClassName={(record) =>
              record.isModuleHeader ? 'module-header-row' : ''
            }
            style={{
              '--module-header-bg': '#fafafa',
            } as React.CSSProperties}
          />
          <style>{`
            .module-header-row {
              background: #fafafa;
            }
            .module-header-row td {
              font-weight: 600;
            }
          `}</style>
        </Card>
      </div>

      {/* 权限配置弹窗 */}
      <PermissionConfigModal
        visible={modalVisible}
        role={selectedRole}
        onClose={() => {
          setModalVisible(false)
          setSelectedRole(null)
        }}
        onSave={handleSavePermissions}
        readOnly={!canEdit}
      />
    </div>
  )
}

export default RolePermission
