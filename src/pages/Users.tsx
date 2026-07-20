import React, { useCallback } from 'react'
import type { Key } from 'react'
import {
  Table,
  Button,
  Space,
  Tag,
  Input,
  Popconfirm,
  Dropdown,
  DatePicker,
  Row,
  Col,
  Select,
  Card,
} from 'antd'
import {
  SearchOutlined,
  PlusOutlined,
  ExportOutlined,
  DeleteOutlined,
  FilterOutlined,
  DownOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import type { User, UserRole, MemberLevel, UserStatus } from '../types/user'
import { useUsers } from './users/useUsers'
import { buildUserColumns } from './users/columns'
import { exportUsers } from './users/export'
import UserFormModal from '../components/UserFormModal'
import UserDetailDrawer from '../components/UserDetailDrawer'

const { RangePicker } = DatePicker

// ==================== 主组件 ====================
const Users: React.FC = () => {
  const u = useUsers()

  // 表格列定义
  const columns = buildUserColumns({
    onViewUser: u.handleViewUser,
    onOpenEdit: u.handleOpenEdit,
    onToggleStatus: u.handleToggleStatus,
    onDelete: u.handleDelete,
    hasPermission: u.hasPermission,
    roleOptions: u.roleOptions,
    memberLevelOptions: u.memberLevelOptions,
    statusOptions: u.statusOptions,
    getRoleColor: u.getRoleColor,
    getStatusColor: u.getStatusColor,
    getMemberLevelColor: u.getMemberLevelColor,
  })

  // 导出菜单
  const exportMenuItems = [
    { key: 'csv', label: '导出 CSV', icon: <ExportOutlined /> },
    { key: 'excel', label: '导出 Excel', icon: <ExportOutlined /> },
  ]

  const handleExportMenuClick = useCallback(
    ({ key }: { key: string }) => {
      if (key === 'csv') exportUsers('csv', u.data as unknown as Record<string, unknown>[], u.roleOptions, u.memberLevelOptions, u.statusOptions)
      else if (key === 'excel') exportUsers('excel', u.data as unknown as Record<string, unknown>[], u.roleOptions, u.memberLevelOptions, u.statusOptions)
    },
    [u.data, u.roleOptions, u.memberLevelOptions, u.statusOptions]
  )

  return (
    <div>
      {/* 顶部工具栏 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Space size="middle" wrap>
              <Input
                placeholder="搜索邮箱、昵称、手机号或ID"
                prefix={<SearchOutlined />}
                value={u.searchText}
                onChange={e => {
                  u.setSearchText(e.target.value)
                  u.resetPage()
                }}
                allowClear
                style={{ width: 280 }}
              />
              <Button
                icon={<FilterOutlined />}
                onClick={() => u.setShowFilters(prev => !prev)}
                type={u.showFilters ? 'primary' : 'default'}
              >
                高级筛选
                {u.showFilters && (
                  <Tag color="blue" style={{ marginLeft: 4 }}>
                    {Object.values(u.filterValues).filter(v => v !== undefined && v !== null).length}
                  </Tag>
                )}
              </Button>
            </Space>
          </Col>
          <Col>
            <Space size="middle">
              {(u.hasPermission('users:write') || u.hasPermission('users:delete')) && (
                <>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={u.handleOpenCreate}
                  >
                    新增用户
                  </Button>
                  {u.selectedRowKeys.length > 0 && (
                    <Popconfirm
                      title="批量禁用"
                      description={`确认禁用选中的 ${u.selectedRowKeys.length} 个用户？`}
                      onConfirm={u.handleBatchDisable}
                      okText="禁用"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                    >
                      <Button danger icon={<DeleteOutlined />}>
                        批量禁用 ({u.selectedRowKeys.length})
                      </Button>
                    </Popconfirm>
                  )}
                </>
              )}
              <Dropdown menu={{ items: exportMenuItems, onClick: handleExportMenuClick }}>
                <Button icon={<ExportOutlined />}>
                  导出 <DownOutlined />
                </Button>
              </Dropdown>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  u.setSearchText('')
                  u.setFilterValues({})
                  u.setSelectedRowKeys([])
                  u.fetchUsers()
                }}
              >
                刷新
              </Button>
            </Space>
          </Col>
        </Row>

        {/* 高级筛选区域 */}
        {u.showFilters && (
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={12} md={6}>
              <Select
                style={{ width: '100%' }}
                placeholder="选择角色"
                allowClear
                value={u.filterValues.role}
                onChange={value => u.setFilterValues(prev => ({ ...prev, role: value as UserRole | undefined }))}
                options={u.roleOptions}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                style={{ width: '100%' }}
                placeholder="选择状态"
                allowClear
                value={u.filterValues.status}
                onChange={value => u.setFilterValues(prev => ({ ...prev, status: value as UserStatus | undefined }))}
                options={u.statusOptions}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                style={{ width: '100%' }}
                placeholder="选择会员等级"
                allowClear
                value={u.filterValues.member_level}
                onChange={value => u.setFilterValues(prev => ({ ...prev, member_level: value as MemberLevel | undefined }))}
                options={u.memberLevelOptions}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <RangePicker
                style={{ width: '100%' }}
                placeholder={['注册开始日期', '注册结束日期']}
                onChange={(_, dateStrings) => {
                  u.setFilterValues(prev => ({
                    ...prev,
                    dateRange: dateStrings[0] && dateStrings[1] ? dateStrings as [string, string] : undefined,
                  }))
                }}
              />
            </Col>
          </Row>
        )}
      </Card>

      {/* 数据表格 */}
      <Table<User>
        columns={columns}
        dataSource={u.data}
        rowKey="id"
        loading={u.loading}
        pagination={{
          ...u.tablePagination,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `显示 ${range[0]}-${range[1]} 条，共 ${total} 条`,
        }}
        onChange={pag => {
          const page = pag.current ?? 1
          const size = pag.pageSize ?? 10
          u.handlePageChange(page, size)
          u.fetchUsers(page, size)
        }}
        scroll={{ x: 1400 }}
        rowSelection={
          (u.hasPermission('users:write') || u.hasPermission('users:delete'))
            ? {
                selectedRowKeys: u.selectedRowKeys,
                onChange: (keys: Key[]) => u.setSelectedRowKeys(keys),
              }
            : undefined
        }
        size="middle"
        bordered
      />

      {/* 用户表单弹窗 */}
      <UserFormModal
        open={u.modalOpen}
        mode={u.modalMode}
        user={u.currentUser}
        onCancel={() => {
          u.setModalOpen(false)
          u.setCurrentUser(null)
        }}
        onSubmit={u.modalMode === 'create' ? u.handleCreate : u.handleEdit}
      />

      {/* 用户详情抽屉 */}
      <UserDetailDrawer
        open={u.drawerOpen}
        user={u.detailUser}
        stats={u.userStats}
        logs={u.userLogs}
        loading={u.detailLoading}
        onClose={() => {
          u.setDrawerOpen(false)
          u.setDetailUser(null)
          u.setUserStats(null)
          u.setUserLogs([])
        }}
      />
    </div>
  )
}

export default Users
