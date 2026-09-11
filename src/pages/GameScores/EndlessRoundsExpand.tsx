import React from 'react'
import { Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'

const { Text } = Typography

/** 无尽模式单局明细行（game_endless_rounds） */
export interface EndlessRoundRow {
  id: string
  round_no: number
  score: number
  moves: number | null
  duration_ms: number | null
}

/**
 * 无尽模式「局明细」展开表（2026-09-11 需求）：替代原维度值表格。
 * 列 = 对局信息（第 N 局）/ 得分 / 步数 / 用时；底部合计行汇总得分与用时。
 * 数据源为 App 端总结算时一次性上传的 game_endless_rounds；
 * 历史会话（旧模型无明细）由父级回退展示维度值表格。
 */
const EndlessRoundsExpand: React.FC<{ rows: EndlessRoundRow[] }> = ({ rows }) => {
  const totalScore = rows.reduce((s, r) => s + (r.score ?? 0), 0)
  const totalMs = rows.reduce((s, r) => s + (r.duration_ms ?? 0), 0)

  const columns: ColumnsType<EndlessRoundRow> = [
    {
      title: '对局信息',
      dataIndex: 'round_no',
      key: 'round_no',
      width: 140,
      render: (v: number) => <Text strong>第 {v} 局</Text>,
    },
    {
      title: '得分',
      dataIndex: 'score',
      key: 'score',
      render: (v: number) => v?.toLocaleString?.() ?? v,
    },
    {
      title: '步数',
      dataIndex: 'moves',
      key: 'moves',
      render: (v: number | null) => v ?? '-',
    },
    {
      title: '用时(s)',
      dataIndex: 'duration_ms',
      key: 'duration_ms',
      render: (v: number | null) => (v == null ? '-' : `${(v / 1000).toFixed(1)}s`),
    },
  ]

  return (
    <Table
      dataSource={rows}
      rowKey="id"
      pagination={false}
      size="small"
      columns={columns}
      summary={() => (
        <Table.Summary fixed>
          <Table.Summary.Row>
            <Table.Summary.Cell index={0}>
              <Text strong>合计（{rows.length} 局）</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={1}>
              <Text strong>{totalScore.toLocaleString?.() ?? totalScore}</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={2}>-</Table.Summary.Cell>
            <Table.Summary.Cell index={3}>
              <Text strong>{(totalMs / 1000).toFixed(1)}s</Text>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        </Table.Summary>
      )}
    />
  )
}

export default EndlessRoundsExpand
