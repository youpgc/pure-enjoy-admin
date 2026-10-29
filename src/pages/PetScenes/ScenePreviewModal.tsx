import React, { useEffect, useState } from 'react'
import { Modal, Button, Switch, Tag, Typography } from 'antd'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import type { PetSceneRow } from '../../types/pet'

// ==================== 场景主题预览弹窗 ====================
//
// 按手机主页构图预览背景：竖版相框（390×844 与 App 逻辑分辨率同比例，
// cover 裁切口径一致）+ 布局参考线（顶部 UI 区 ~15% / 宠物箱 / 底部状态卡区
// ~20%，由 App pet_home_screen_layout.dart 常量推导：舞台左右边距
// _kEdgeInset(64)+40=104/390、宠物箱=正方形（边=舞台宽）且底缘锚状态卡上方
// 30px、面板常态高 168（游历提示行 +~30）——20261028 主体下移改版后同步）。
// 图片约定：public/pet-scenes/<scene_code>.png（与 App assets/pets/scenes 同名同步）。

/** 相框宽（高按 390:844 自动推导） */
const FRAME_W = 220

// ---- 宠物箱几何（% 相对相框，推导自 App 布局常量，勿手调单值） ----
// 左右内边距占比 = 104/390；箱宽占比 = 1 − 2×26.67% = 46.67%（宽）
// 箱高占比 = 宽占比 × (390/844) = 21.6%（高，正方形换算）
// 底距占比 = (面板168+30)/844 = 23.5%；箱 top = 100% − 底距 − 箱高 = 55.0%
const BOX_LEFT = 26.7
const BOX_WIDTH = 46.6
const BOX_TOP = 55.0
const BOX_HEIGHT = 21.6
const PANEL_HEIGHT = 20.0
const TOP_UI_HEIGHT = 15.0

interface Props {
  open: boolean
  /** 全部场景行（预览时可左右切换浏览） */
  rows: PetSceneRow[]
  /** 当前打开的场景行 */
  scene: PetSceneRow | null
  onCancel: () => void
}

const ScenePreviewModal: React.FC<Props> = ({ open, rows, scene, onCancel }) => {
  const [index, setIndex] = useState(0)
  const [imgFailed, setImgFailed] = useState(false)
  const [guides, setGuides] = useState(true)

  // 每次打开定位到所点行并复位图片失败态
  useEffect(() => {
    if (open) {
      const i = rows.findIndex((r) => r.id === scene?.id)
      setIndex(i >= 0 ? i : 0)
      setImgFailed(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const safeIndex = Math.min(index, Math.max(rows.length - 1, 0))
  const current = rows[safeIndex]

  const go = (delta: number) => {
    setImgFailed(false)
    setIndex((i) => Math.min(Math.max(i + delta, 0), rows.length - 1))
  }

  return (
    <Modal
      title={current ? `主题预览 · ${current.name}` : '主题预览'}
      open={open}
      footer={null}
      onCancel={onCancel}
      destroyOnHidden
      width={420}
      centered
    >
      {current ? (
        <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
          {/* 参考线开关 */}
          <div style={{ marginBottom: 8 }}>
            <Switch
              size="small"
              checked={guides}
              onChange={setGuides}
              checkedChildren="参考线"
              unCheckedChildren="参考线"
            />
            <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
              模拟 App 主页构图（宠物叠加渲染于宠物箱，底缘=状态卡上方 30px）
            </Typography.Text>
          </div>

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
              aria-label="上一场景"
            />
            {/* 手机相框：竖版 390:844，cover 裁切与 App BoxFit.cover 同口径 */}
            <div
              style={{
                width: FRAME_W,
                aspectRatio: '390 / 844',
                position: 'relative',
                borderRadius: 16,
                overflow: 'hidden',
                background: '#fafafa',
                border: '1px solid #eee',
              }}
            >
              {imgFailed ? (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 16,
                  }}
                >
                  <Typography.Text type="secondary">
                    预览图未落位：public/pet-scenes/{current.scene_code}.png
                  </Typography.Text>
                </div>
              ) : (
                <img
                  alt={current.scene_code}
                  src={`${import.meta.env.BASE_URL}pet-scenes/${current.scene_code}.png`}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={() => setImgFailed(true)}
                />
              )}

              {/* 布局参考线（顶部 UI / 宠物站位 / 底部状态卡） */}
              {guides && (
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: `${TOP_UI_HEIGHT}%`,
                      borderBottom: '1.5px dashed rgba(255,255,255,0.9)',
                      background: 'rgba(0,0,0,0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ color: '#fff', fontSize: 11, textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
                      顶部 UI 区
                    </span>
                  </div>
                  {/* 宠物箱：正方形，底缘 = 状态卡上方 30px（App 同构） */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${BOX_LEFT}%`,
                      width: `${BOX_WIDTH}%`,
                      top: `${BOX_TOP}%`,
                      height: `${BOX_HEIGHT}%`,
                      border: '1.5px dashed rgba(255,255,255,0.9)',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ color: '#fff', fontSize: 11, textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
                      宠物箱
                    </span>
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: `${PANEL_HEIGHT}%`,
                      borderTop: '1.5px dashed rgba(255,255,255,0.9)',
                      background: 'rgba(0,0,0,0.18)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'center',
                      paddingTop: 4,
                    }}
                  >
                    <span style={{ color: '#fff', fontSize: 11, textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
                      状态卡区
                    </span>
                  </div>
                </div>
              )}
            </div>
            <Button
              shape="circle"
              icon={<RightOutlined />}
              disabled={safeIndex >= rows.length - 1}
              onClick={() => go(1)}
              aria-label="下一场景"
            />
          </div>

          {/* 名称 + 编码 + 状态标签 */}
          <div style={{ marginTop: 12 }}>
            <Typography.Text strong style={{ fontSize: 15 }}>
              {current.name}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
              {current.scene_code}
            </Typography.Text>
          </div>
          <div style={{ marginTop: 8 }}>
            {current.is_default && <Tag color="blue">默认</Tag>}
            <Tag color={current.on_shelf ? 'green' : 'default'}>
              {current.on_shelf ? '已上架' : '未上架'}
            </Tag>
            <Tag>
              {current.price_coin === null || current.price_coin === undefined
                ? '未定价'
                : `${current.price_coin} 金币`}
            </Tag>
          </div>

          {/* 场景指示点 */}
          <div style={{ marginTop: 8 }}>
            {rows.map((s, i) => (
              <Tag
                key={s.id}
                color={i === safeIndex ? 'blue' : 'default'}
                style={{ cursor: 'pointer', marginInlineEnd: 4 }}
                onClick={() => {
                  setImgFailed(false)
                  setIndex(i)
                }}
              >
                {s.name}
              </Tag>
            ))}
          </div>
        </div>
      ) : null}
    </Modal>
  )
}

export default ScenePreviewModal
