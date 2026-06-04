import React from 'react'
import { Tag } from 'antd'

const NoPermission: React.FC<{ module: string }> = ({ module }) => (
  <div style={{ textAlign: 'center', padding: '50px 0' }}>
    <Tag color="warning">您没有查看{module}的权限</Tag>
  </div>
)

export default NoPermission
