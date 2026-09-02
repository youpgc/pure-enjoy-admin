// 应用版本下载二维码弹窗（从 VersionManagement.tsx 抽取，行为保持）
import { Modal, Button, Typography } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import { QRCodeSVG } from 'qrcode.react'
import type { AppVersion } from './types'
import styles from './VersionQrModal.module.css'
import common from '../../../styles/common.module.css'

interface VersionQrModalProps {
  version: AppVersion | null
  onClose: () => void
}

export function VersionQrModal({ version, onClose }: VersionQrModalProps) {
  const getDownloadUrl = (record: AppVersion) => record.apk_url || ''

  return (
    <Modal
      title="下载二维码"
      open={!!version}
      onCancel={onClose}
      footer={null}
      width={400}
      centered
    >
      {version && (
        <div className={styles.qrWrap}>
          <div className={styles.qrBox}>
            <QRCodeSVG
              value={getDownloadUrl(version) || 'https://example.com'}
              size={180}
              level="M"
            />
          </div>
          <div className={common.mb8}>
            <Typography.Text strong>v{version.version}+{version.build_number}</Typography.Text>
          </div>
          <div className={common.mb12}>
            <Typography.Text type="secondary">
              {getDownloadUrl(version) || '暂无下载地址'}
            </Typography.Text>
          </div>
          {getDownloadUrl(version) && (
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => {
                window.open(getDownloadUrl(version), '_blank')
              }}
            >
              下载APK
            </Button>
          )}
        </div>
      )}
    </Modal>
  )
}
