import React from 'react'
import { Tag } from 'antd'
import styles from './NoPermission.module.css'
import common from '../styles/common.module.css'

const NoPermission: React.FC<{ module: string }> = ({ module }) => (
  <div className={`${common.textCenter} ${styles.wrap}`}>
    <Tag color="warning">您没有查看{module}的权限</Tag>
  </div>
)

export default NoPermission
