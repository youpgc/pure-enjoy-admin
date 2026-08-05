import React, { useState, useEffect, useMemo } from 'react'
import { Modal, Checkbox, Button, message, Divider, Tag } from 'antd'
import type { CheckboxChangeEvent } from 'antd/es/checkbox'
import type { Role, Permission } from '../types/permission'
import { resolvePermissionPage, GROUP_ORDER, GROUP_COLORS } from '../constants/permissionMenuMap'

interface PermissionConfigModalProps {
  visible: boolean
  role: Role | null
  permissions: Permission[]
  rolePermissions: Array<{ role_id: number; permission_id: number }>
  onClose: () => void
  onSave: (roleId: number, permissionIds: number[]) => Promise<void>
  readOnly?: boolean
}

const PermissionConfigModal: React.FC<PermissionConfigModalProps> = ({
  visible,
  role,
  permissions,
  rolePermissions,
  onClose,
  onSave,
  readOnly = false,
}) => {
  const [saving, setSaving] = useState(false)
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([])

  // 按「菜单分组 -> 页面」组织的权限
  const { groupedPermissions, pagePermissionIds } = useMemo(() => {
    const groupMap: Record<string, Record<string, Permission[]>> = {}
    const pageIds: Record<string, number[]> = {}
    permissions.forEach(permission => {
      const info = resolvePermissionPage(permission.name, permission.module)
      const g = groupMap[info.group] || (groupMap[info.group] = {})
      const pg = g[info.page] || (g[info.page] = [])
      pg.push(permission)
      const ids = pageIds[info.page] || (pageIds[info.page] = [])
      ids.push(permission.id)
    })
    // 分组按侧边栏顺序
    const orderedGroups: Record<string, Record<string, Permission[]>> = {}
    Object.keys(groupMap)
      .sort((a, b) => {
        const ia = GROUP_ORDER.indexOf(a)
        const ib = GROUP_ORDER.indexOf(b)
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
      })
      .forEach(g => { orderedGroups[g] = groupMap[g]! })
    return { groupedPermissions: orderedGroups, pagePermissionIds: pageIds }
  }, [permissions])

  // 加载角色权限
  useEffect(() => {
    if (visible && role) {
      const rolePerms = rolePermissions
        .filter(rp => rp.role_id === role.id)
        .map(rp => rp.permission_id)
      setSelectedPermissionIds(rolePerms)
    }
  }, [visible, role, rolePermissions])

  // 处理单个权限勾选
  const handlePermissionChange = (permissionId: number) => (e: CheckboxChangeEvent) => {
    if (readOnly) return
    const checked = e.target.checked
    setSelectedPermissionIds(prev =>
      checked ? [...prev, permissionId] : prev.filter(id => id !== permissionId)
    )
  }

  // 处理页面全选/取消
  const handlePageCheckAll = (page: string, checked: boolean) => {
    if (readOnly) return
    const pagePermissionIdsList = pagePermissionIds[page] || []
    setSelectedPermissionIds(prev => {
      if (checked) {
        return [...new Set([...prev, ...pagePermissionIdsList])]
      }
      return prev.filter(id => !pagePermissionIdsList.includes(id))
    })
  }

  // 保存权限配置
  const handleSave = async () => {
    if (saving) return
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

  // 检查页面是否全选
  const isPageAllChecked = (page: string) => {
    const pagePermissionIdsList = pagePermissionIds[page] || []
    return pagePermissionIdsList.length > 0 &&
      pagePermissionIdsList.every(id => selectedPermissionIds.includes(id))
  }

  // 检查页面是否部分选中
  const isPageIndeterminate = (page: string) => {
    const pagePermissionIdsList = pagePermissionIds[page] || []
    const checkedCount = pagePermissionIdsList.filter(id => selectedPermissionIds.includes(id)).length
    return checkedCount > 0 && checkedCount < pagePermissionIdsList.length
  }

  return (
    <Modal
      title={
        <span>
          配置权限 - {role?.name}
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
      {role && (
        <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>{role.name}</div>
          <div style={{ color: '#666', fontSize: 13 }}>{role.description}</div>
          <div style={{ marginTop: 8 }}>
            <Tag color="green">{selectedPermissionIds.length} 个权限</Tag>
          </div>
        </div>
      )}

      {Object.entries(groupedPermissions).map(([group, pages]) => (
        <div key={group} style={{ marginBottom: 20 }}>
          <Divider
            orientation="left"
            style={{ color: GROUP_COLORS[group] || '#666', fontWeight: 600, fontSize: 14 }}
          >
            {group}
          </Divider>
          {Object.entries(pages).map(([page, pagePermissions]) => {
            const pageIcon = resolvePermissionPage(pagePermissions[0]!.name, pagePermissions[0]!.module).icon
            return (
              <div key={page} style={{ marginBottom: 16 }}>
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
                    checked={isPageAllChecked(page)}
                    indeterminate={isPageIndeterminate(page)}
                    onChange={e => handlePageCheckAll(page, e.target.checked)}
                    disabled={readOnly}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: GROUP_COLORS[group] || '#666' }}>{pageIcon}</span>
                      <span style={{ fontWeight: 500 }}>{page}</span>
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
                      {pagePermissions.map(permission => (
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
              </div>
            )
          })}
        </div>
      ))}
    </Modal>
  )
}

export default PermissionConfigModal
