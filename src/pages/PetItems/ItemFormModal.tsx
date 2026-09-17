import React, { useEffect, useState } from 'react'
import { Modal, Form, Input, InputNumber, Select, Switch, message } from 'antd'
import type { PetItemRow } from '../../types/pet'
import {
  PET_ITEM_CATEGORY_OPTIONS,
  PET_ITEM_CHANNEL_OPTIONS,
  PET_LADDER_KEY_OPTIONS,
} from '../../constants/pet'
import { petEggPoolService } from '../../services/petService'
import { EffectEditor } from '../../components/form/pet/editors/ItemEditors'
import { JsonFormItem } from '../../components/form/pet/JsonFormItem'
import { asObject } from '../../components/form/pet/editors/shared'
import common from '../../styles/common.module.css'

// ==================== 道具编辑弹窗（pet_items，含扩容阶梯编辑器） ====================
//
// effect 按分类结构化（与 RPC 消费同源）：
// - 蛋类：{pool, mode}（rpc_pet_hatch_instant）；
// - 消耗品：{type: feed|clean|toy, hunger/mood/exp}（rpc_pet_use_item 白名单）；
// - 工具/装备：开放结构（ladder/rescue 等）→ JSON 高级编辑。

export interface ItemFormValues {
  item_code: string
  name: string
  description: string | null
  icon: string | null
  category: string
  sub_type: string | null
  effect: Record<string, unknown>
  stack_limit: number
  price_coin: number
  channels: string
  ladder_key: string
  ladder_step: number | null
  add_capacity: number | null
  purchase_limit: number | null
  on_shelf: boolean
  sort_order: number
}

interface Props {
  open: boolean
  editing: PetItemRow | null
  saving: boolean
  onOk: (values: ItemFormValues) => void
  onCancel: () => void
}

const ItemFormModal: React.FC<Props> = ({ open, editing, saving, onOk, onCancel }) => {
  const [form] = Form.useForm()
  const [poolOptions, setPoolOptions] = useState<Array<{ value: string; label: string }>>([])
  // 阶梯编辑联动：选择阶梯 key 后 step / add_capacity 必填（与 DDL 三列同形 check 对齐）
  const ladderKey = Form.useWatch('ladder_key', form)
  const category = Form.useWatch('category', form)

  useEffect(() => {
    if (!open) return
    petEggPoolService.findAll().then((res) => {
      if (res.success && res.data) {
        setPoolOptions(res.data.map((p) => ({ value: p.pool_code, label: p.pool_code })))
      }
    })
  }, [open])

  const initialValues = (): Record<string, unknown> => {
    if (editing) {
      return {
        ...editing,
        description: editing.description ?? '',
        sub_type: editing.sub_type ?? '',
        effect: asObject(editing.effect),
        icon: editing.icon ?? '',
        ladder_key: editing.ladder_key ?? '',
        purchase_limit: editing.purchase_limit ?? undefined,
      }
    }
    return {
      effect: {},
      stack_limit: 99,
      price_coin: 0,
      channels: 'shop',
      ladder_key: '',
      on_shelf: false,
      sort_order: 0,
    }
  }

  const handleOk = async () => {
    const values = await form.validateFields()
    // 阶梯三列同形校验（DDL pet_items_ladder_shape_chk 的应用层前置）
    const isLadder = !!values.ladder_key
    if (isLadder && (values.ladder_step == null || values.add_capacity == null)) {
      return void message.error('扩容阶梯道具必须填写步号与本步加格数')
    }
    if (!isLadder) {
      values.ladder_step = null
      values.add_capacity = null
    } else if (values.purchase_limit !== 1) {
      // 阶梯道具每档限购 1 次（业务铁律），这里强制归一
      values.purchase_limit = 1
    }
    onOk({ ...values, effect: asObject(values.effect) })
  }

  return (
    <Modal
      title={editing ? '编辑道具' : '新增道具'}
      open={open}
      onOk={handleOk}
      confirmLoading={saving}
      afterOpenChange={(o) => {
        if (o) {
          form.resetFields()
          form.setFieldsValue(initialValues())
        }
      }}
      onCancel={onCancel}
      destroyOnHidden
      width={640}
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="item_code"
          label="道具编码"
          tooltip="App/素材引用键，唯一"
          rules={[{ required: true, message: '请输入道具编码' }]}
        >
          <Input placeholder="如 food_can / expand_backpack_1" />
        </Form.Item>
        <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
          <Input placeholder="如 猫罐头" />
        </Form.Item>
        <Form.Item name="description" label="说明">
          <Input.TextArea rows={2} placeholder="道具效果说明（App 商城/背包展示）" />
        </Form.Item>
        <Form.Item
          name="icon"
          label="图标键"
          tooltip="素材引用键，双端资源路径 /pet-icons/<键>.svg；留空列表回退键名"
        >
          <Input allowClear placeholder="icon/food_basic" />
        </Form.Item>
        <Form.Item
          name="category"
          label="分类（背包四分区）"
          rules={[{ required: true, message: '请选择分类' }]}
        >
          <Select options={PET_ITEM_CATEGORY_OPTIONS} />
        </Form.Item>
        <Form.Item name="sub_type" label="子类型" tooltip="food/clean/toy/evolution/rescue/exp/retake/unlock/expand 等，可留空">
          <Input allowClear placeholder="如 food" />
        </Form.Item>

        {category === 'egg' || category === 'consumable' ? (
          <Form.Item name="effect" label="使用效果">
            <EffectEditor category={category} poolOptions={poolOptions} />
          </Form.Item>
        ) : (
          <JsonFormItem
            name="effect"
            label="使用效果（jsonb，高级）"
            tooltip='工具/装备类为开放结构（如救援 {"type":"rescue"}、扩容 {"ladder":"backpack"}），保留 JSON 编辑'
            placeholder='{"type":"rescue"}'
            rows={3}
          />
        )}

        <Form.Item name="stack_limit" label="单格堆叠上限" tooltip="蛋固定 1（不可改小于 1）；普通道具默认 99">
          <InputNumber min={1} className={common.fullWidth} />
        </Form.Item>

        <Form.Item name="channels" label="获取渠道">
          <Select options={PET_ITEM_CHANNEL_OPTIONS} />
        </Form.Item>
        <Form.Item name="price_coin" label="金币价格" rules={[{ required: true, message: '请输入金币价格' }]}>
          <InputNumber min={0} className={common.fullWidth} addonAfter="金币" />
        </Form.Item>
        {/* 积分购买已下线（2026-09-17）：价格走 price_points / points_purchasable 的入口移除，
            保存时由目录页强制 price_points=null / points_purchasable=false */}

        <Form.Item
          name="ladder_key"
          label="扩容阶梯"
          tooltip="选择后本道具成为扩容阶梯档位（每档限购 1 次，购买后永久加格）"
        >
          <Select options={PET_LADDER_KEY_OPTIONS} />
        </Form.Item>
        {ladderKey ? (
          <>
            <Form.Item
              name="ladder_step"
              label="阶梯步号"
              tooltip="有序；达上限后商城不再展示更高步"
              rules={[{ required: true, message: '请输入步号' }]}
            >
              <InputNumber min={1} className={common.fullWidth} />
            </Form.Item>
            <Form.Item
              name="add_capacity"
              label="本步加格数"
              rules={[{ required: true, message: '请输入加格数' }]}
            >
              <InputNumber min={1} className={common.fullWidth} addonAfter="格" />
            </Form.Item>
            <Form.Item name="purchase_limit" label="限购次数">
              <InputNumber min={1} max={1} disabled className={common.fullWidth} addonAfter="阶梯道具固定 1 次" />
            </Form.Item>
          </>
        ) : (
          <Form.Item name="purchase_limit" label="通用限购" tooltip="留空 = 不限购">
            <InputNumber min={1} className={common.fullWidth} />
          </Form.Item>
        )}

        <Form.Item name="sort_order" label="排序号">
          <InputNumber min={0} className={common.fullWidth} />
        </Form.Item>
        <Form.Item name="on_shelf" label="上架" valuePropName="checked" tooltip="关闭 = 商城不可见（下架）">
          <Switch checkedChildren="上架" unCheckedChildren="下架" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default ItemFormModal
