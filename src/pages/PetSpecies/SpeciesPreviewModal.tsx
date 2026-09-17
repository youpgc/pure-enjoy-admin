import React, { useEffect, useState } from 'react'
import { Modal, Button, Tag, Typography } from 'antd'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import type { PetSpeciesRow } from '../../types/pet'

// ==================== 种属 3 阶段预览弹窗 ====================
//
// 内容为该进化链（基础形 → 一阶 → 二阶）各阶段预览图，
// 左右切换浏览，默认展示基础形。
// 图片约定：public/pet-art/<species_code>.png（未落位资源时回退占位图标）。

const STAGE_LABELS = ['基础形', '一阶', '二阶', '三阶', '四阶']

const stageNum = (code: string): number => {
  const m = /_s(\d+)$/.exec(code)
  return m ? Number(m[1]) : 0
}

interface Props {
  open: boolean
  /** 该种属全阶段行（已按 基础形→一阶→二阶 排序） */
  stages: PetSpeciesRow[]
  onCancel: () => void
}

const SpeciesPreviewModal: React.FC<Props> = ({ open, stages, onCancel }) => {
  const [index, setIndex] = useState(0)
  const [imgFailed, setImgFailed] = useState(false)

  // 每次打开重置到基础形
  useEffect(() => {
    if (open) {
      setIndex(0)
      setImgFailed(false)
    }
  }, [open])

  // 弹窗关闭/行变化时收敛下标
  const safeIndex = Math.min(index, Math.max(stages.length - 1, 0))
  const current = stages[safeIndex]

  const go = (delta: number) => {
    setImgFailed(false)
    setIndex((i) => {
      const next = i + delta
      if (next < 0 || next >= stages.length) return i
      return next
    })
  }

  return (
    <Modal
      title={current ? `形态预览 · ${stages[0]?.name_cn ?? ''}` : '形态预览'}
      open={open}
      footer={null}
      onCancel={onCancel}
      destroyOnHidden
      width={420}
      centered
    >
      {current ? (
        <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
          {/* 图片区（左右切换） */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <Button
              shape="circle"
              icon={<LeftOutlined />}
              disabled={safeIndex <= 0}
              onClick={() => go(-1)}
              aria-label="上一阶段"
            />
            <div
              style={{
                width: 260,
                height: 260,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                background: '#fafafa',
                overflow: 'hidden',
              }}
            >
              {imgFailed ? (
                <Typography.Text type="secondary">
                  {current.species_code} 预览图未配置
                </Typography.Text>
              ) : (
                <img
                  alt={current.species_code}
                  src={`/pet-art/${current.species_code}.png`}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  onError={() => setImgFailed(true)}
                />
              )}
            </div>
            <Button
              shape="circle"
              icon={<RightOutlined />}
              disabled={safeIndex >= stages.length - 1}
              onClick={() => go(1)}
              aria-label="下一阶段"
            />
          </div>

          {/* 阶段名 + 编码 */}
          <div style={{ marginTop: 12 }}>
            <Typography.Text strong style={{ fontSize: 15 }}>
              {STAGE_LABELS[stageNum(current.species_code)] ?? `阶段 ${stageNum(current.species_code)}`}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
              {current.name_cn} · {current.species_code}
            </Typography.Text>
          </div>

          {/* 阶段指示点 */}
          <div style={{ marginTop: 8 }}>
            {stages.map((s, i) => (
              <Tag
                key={s.id}
                color={i === safeIndex ? 'blue' : 'default'}
                style={{ cursor: 'pointer', marginInlineEnd: 4 }}
                onClick={() => {
                  setImgFailed(false)
                  setIndex(i)
                }}
              >
                {STAGE_LABELS[stageNum(s.species_code)] ?? s.species_code}
              </Tag>
            ))}
          </div>
        </div>
      ) : null}
    </Modal>
  )
}

export default SpeciesPreviewModal
