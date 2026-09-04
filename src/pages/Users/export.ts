// 用户列表导出（CSV / Excel），从 Users.tsx 抽取，行为保持
import dayjs from 'dayjs'
import { message } from 'antd'
import { exportToCSV, exportToExcel } from '../../utils/export'
import type { ExportColumn } from '../../utils/export'

export function buildUserExportColumns(
  roleOptions: { value: string; label: string }[],
  memberLevelOptions: { value: string; label: string }[],
  statusOptions: { value: string; label: string }[],
): ExportColumn[] {
  return [
    { title: '用户ID', dataIndex: 'id' },
    { title: '邮箱', dataIndex: 'email' },
    { title: '昵称', dataIndex: 'nickname', render: (v: unknown) => String(v || '') },
    { title: '用户名', dataIndex: 'username', render: (v: unknown) => String(v || '') },
    { title: '手机号', dataIndex: 'phone', render: (v: unknown) => String(v || '') },
    { title: '性别', dataIndex: 'gender', render: (v: unknown) => String(v || '') },
    { title: '个性签名', dataIndex: 'bio', render: (v: unknown) => String(v || '') },
    { title: '所在地', dataIndex: 'location', render: (v: unknown) => String(v || '') },
    { title: '职业', dataIndex: 'occupation', render: (v: unknown) => String(v || '') },
    { title: '公司', dataIndex: 'company', render: (v: unknown) => String(v || '') },
    { title: '角色', dataIndex: 'role', render: (v: unknown) => roleOptions.find(opt => opt.value === v)?.label || String(v) },
    { title: '会员等级', dataIndex: 'member_level', render: (v: unknown) => memberLevelOptions.find(opt => opt.value === v)?.label || String(v) },
    { title: '积分', dataIndex: 'points' },
    { title: '状态', dataIndex: 'status', render: (v: unknown) => statusOptions.find(opt => opt.value === v)?.label || String(v) },
    { title: '注册时间', dataIndex: 'created_at', render: (v: unknown) => dayjs(String(v)).format('YYYY-MM-DD HH:mm:ss') },
  ]
}

export function exportUsers(
  format: 'csv' | 'excel',
  data: Record<string, unknown>[],
  roleOptions: { value: string; label: string }[],
  memberLevelOptions: { value: string; label: string }[],
  statusOptions: { value: string; label: string }[],
): void {
  const columns = buildUserExportColumns(roleOptions, memberLevelOptions, statusOptions)
  if (format === 'csv') {
    exportToCSV(data, columns, '用户列表')
    message.success('CSV 导出成功')
  } else {
    exportToExcel(data, columns, '用户列表')
    message.success('Excel 导出成功')
  }
}
