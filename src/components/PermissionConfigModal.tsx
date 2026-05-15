import React, { useState, useEffect, useMemo } from 'react'
import { Modal, Checkbox, Button, message, Divider, Tag, Spin } from 'antd'
import type { CheckboxChangeEvent } from 'antd/es/checkbox'
import {
  UserOutlined,
  WalletOutlined,
  SmileOutlined,
  LineChartOutlined,
  BookOutlined,
  ReadOutlined,
  MobileOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import type { Role, Permission } from '../types/permission'
import { MODULE_DISPLAY_NAMES, MODULE_COLORS } from '../types/permission'
import { mockPermissions, mockRolePermissions } from '../utils/mockData'

interface PermissionConfigModalProps {
  visible: boolean
  role: Role | null
  onClose: () => void
  onSave: (roleId: number, permissionIds: number[]) => Promise<void>
  readOnly?: boolean
}

// 模块图标映射
const MODULE_ICONS: Record<string, React.ReactNode> = {
  users: <UserOutlined />,
  expenses: <WalletOutlined />,
  moods: <SmileOutlined />,
  weights: <LineChartOutlined />,
  notes: <BookOutlined />,
  novels: <ReadOutlined />,
  versions: <MobileOutlined />,
  system: <SettingOutlined />,
}

const PermissionConfigModal: React.FC<PermissionConfigModalProps> = ({
  visible,
  role,
  onClose,
  onSave,
  readOnly = false,
}) => {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([])

  // 按模块分组的权限
  const permissionsByModule = useMemo(() => {
    const grouped: Record<string, Permission[]> = {}
    mockPermissions.forEach(permission => {
      if (!grouped[permission.module]) {
        grouped[permission.module] = []
      }
      grouped[permission.module]!.push(permission)
    })
    return grouped
  }, [])

  // 加载角色权限
  useEffect(() => {
    if (visible && role) {
      setLoading(true)
      // 模拟异步加载
      setTimeout(() => {
        const rolePerms = mockRolePermissions
          .filter(rp => rp.role_id === role.id)
          .map(rp => rp.permission_id)
        setSelectedPermissionIds(rolePerms)
        setLoading(false)
      }, 300)
    }
  }, [visible, role])

  // 处理单个权限勾选
  const handlePermissionChange = (permissionId: number) => (e: CheckboxChangeEvent) => {
    if (readOnly) return
    const checked = e.target.checked
    setSelectedPermissionIds(prev =>
      checked ? [...prev, permissionId] : prev.filter(id => id !== permissionId)
    )
  }

  // 处理模块全选/取消
  const handleModuleCheckAll = (module: string, checked: boolean) => {
    if (readOnly) return
    const modulePermissionIds = permissionsByModule[module]!.map(p => p.id)
    setSelectedPermissionIds(prev => {
      if (checked) {
        return [...new Set([...prev, ...modulePermissionIds])]
      }
      return prev.filter(id => !modulePermissionIds.includes(id))
    })
  }

  // 保存权限配置
  const handleSave = async () => {
    if (!role || readOnly) return
    setSaving(true)
    try {
      await onSave(role.id, selectedPermissionIds)
      message.success('权限配置保存成功')
      onClose()
    } catch {
      message.error('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  // 检查模块是否全选
  const isModuleAllChecked = (module: string) => {
    const modulePermissionIds = permissionsByModule[module]!.map(p => p.id)
    return modulePermissionIds.every(id => selectedPermissionIds.includes(id))
  }

  // 检查模块是否部分选中
  const isModuleIndeterminate = (module: string) => {
    const modulePermissionIds = permissionsByModule[module]!.map(p => p.id)
    const checkedCount = modulePermissionIds.filter(id => selectedPermissionIds.includes(id)).length
    return checkedCount > 0 && checkedCount < modulePermissionIds.length
  }

  return (
    <Modal
      title={
        <span>
          配置权限 - {role?.display_name}
          {readOnly && <Tag color="orange" style={{ marginLeft: 8 }}>只读模式</Tag>}
        </span>
      }
      open={visible}
      onCancel={onClose}
      width={700}
      footer={[
        <Button key="cancel" onClick={onClose}>
          {readOnly ? '关闭' : '取消'}
        </Button>,
        !readOnly && (
          <Button key="save" type="primary" loading={saving} onClick={handleSave}>
            保存
          </Button>
        ),
      ]}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin />
        </div>
      ) : (
        <div>
          {role && (
            <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>{role.display_name}</div>
              <div style={{ color: '#666', fontSize: 13 }}>{role.description}</div>
              <div style={{ marginTop: 8 }}>
                <Tag color="blue">Level {role.level}</Tag>
                <Tag color="green">{selectedPermissionIds.length} 个权限</Tag>
              </div>
            </div>
          )}

          {Object.entries(permissionsByModule).map(([module, permissions]) => (
            <div key={module} style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: 8,
                  padding: '8px 12px',
                  background: '#fafafa',
                  borderRadius: 6,
                }}
              >
                <Checkbox
                  checked={isModuleAllChecked(module)}
                  indeterminate={isModuleIndeterminate(module)}
                  onChange={e => handleModuleCheckAll(module, e.target.checked)}
                  disabled={readOnly}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: MODULE_COLORS[module] || '#666' }}>
                      {MODULE_ICONS[module]}
                    </span>
                    <span style={{ fontWeight: 500 }}>{MODULE_DISPLAY_NAMES[module] || module}</span>
                  </span>
                </Checkbox>
              </div>
              <div style={{ paddingLeft: 24 }}>
                <Checkbox.Group
                  value={selectedPermissionIds}
                  style={{ width: '100%' }}
                  disabled={readOnly}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 24px' }}>
                    {permissions.map(permission => (
                      <Checkbox
                        key={permission.id}
                        value={permission.id}
                        onChange={handlePermissionChange(permission.id)}
                      >
                        {permission.display_name}
                      </Checkbox>
                    ))}
                  </div>
                </Checkbox.Group>
              </div>
              <Divider style={{ margin: '12px 0' }} />
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

export default PermissionConfigModal
