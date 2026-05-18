import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Tag,
  Space,
  Modal,
  Form,
  Switch,
  Progress,
  message,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Avatar,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  FireOutlined,
  TrophyOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { supabase } from '../utils/supabase';
import dayjs from 'dayjs';

interface Habit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  target_days: number;
  current_streak: number;
  longest_streak: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface HabitRecord {
  id: string;
  habit_id: string;
  user_id: string;
  check_in_date: string;
  note: string | null;
  created_at: string;
}

const Habits: React.FC = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [records, setRecords] = useState<Record<string, HabitRecord[]>>({});
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    totalRecords: 0,
    avgStreak: 0,
  });

  useEffect(() => {
    fetchHabits();
  }, []);

  const fetchHabits = async () => {
    setLoading(true);
    try {
      const { data: habitsData, error: habitsError } = await supabase
        .from('user_habits')
        .select('*')
        .order('created_at', { ascending: false });

      if (habitsError) throw habitsError;

      setHabits(habitsData || []);

      // 获取打卡记录
      const recordsMap: Record<string, HabitRecord[]> = {};
      for (const habit of habitsData || []) {
        const { data: recordData } = await supabase
          .from('habit_records')
          .select('*')
          .eq('habit_id', habit.id)
          .order('check_in_date', { ascending: false });
        recordsMap[habit.id] = recordData || [];
      }
      setRecords(recordsMap);

      calculateStats(habitsData || [], recordsMap);
    } catch (error) {
      message.error('获取习惯列表失败');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (habitsData: Habit[], recordsMap: Record<string, HabitRecord[]>) => {
    const totalRecords = Object.values(recordsMap).reduce((sum, arr) => sum + arr.length, 0);
    const avgStreak = habitsData.length > 0
      ? Math.round(habitsData.reduce((sum, h) => sum + h.current_streak, 0) / habitsData.length)
      : 0;

    setStats({
      total: habitsData.length,
      active: habitsData.filter((h) => h.is_active).length,
      totalRecords,
      avgStreak,
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingHabit) {
        const { error } = await supabase
          .from('user_habits')
          .update(values)
          .eq('id', editingHabit.id);
        if (error) throw error;
        message.success('更新成功');
      } else {
        const { error } = await supabase.from('user_habits').insert([values]);
        if (error) throw error;
        message.success('创建成功');
      }

      setModalVisible(false);
      form.resetFields();
      setEditingHabit(null);
      fetchHabits();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('user_habits').delete().eq('id', id);
      if (error) throw error;
      message.success('删除成功');
      fetchHabits();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const toggleActive = async (record: Habit) => {
    try {
      const { error } = await supabase
        .from('user_habits')
        .update({ is_active: !record.is_active })
        .eq('id', record.id);
      if (error) throw error;
      message.success(record.is_active ? '已暂停' : '已激活');
      fetchHabits();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const openModal = (record?: Habit) => {
    if (record) {
      setEditingHabit(record);
      form.setFieldsValue(record);
    } else {
      setEditingHabit(null);
      form.resetFields();
      form.setFieldsValue({
        target_days: 21,
        is_active: true,
      });
    }
    setModalVisible(true);
  };

  const filteredHabits = habits.filter(
    (item) =>
      !searchText ||
      item.name.toLowerCase().includes(searchText.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchText.toLowerCase())
  );

  const getTodayRecords = (habitId: string) => {
    const habitRecords = records[habitId] || [];
    const today = dayjs().format('YYYY-MM-DD');
    return habitRecords.filter((c) => c.check_in_date === today).length;
  };

  const columns = [
    {
      title: '习惯',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Habit) => (
        <Space>
          <Avatar style={{ backgroundColor: '#1890ff' }}>
            <FireOutlined />
          </Avatar>
          <span>{text}</span>
          {!record.is_active && <Tag color="default">已暂停</Tag>}
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '进度',
      key: 'progress',
      render: (_: any, record: Habit) => {
        const percent = Math.min(100, Math.round((record.current_streak / record.target_days) * 100));
        return (
          <Tooltip title={`${record.current_streak}/${record.target_days} 天`}>
            <Progress percent={percent} size="small" style={{ width: 100 }} />
          </Tooltip>
        );
      },
    },
    {
      title: '连续打卡',
      key: 'streak',
      render: (_: any, record: Habit) => (
        <Space>
          <Tag icon={<FireOutlined />} color="orange">
            当前: {record.current_streak}
          </Tag>
          <Tag icon={<TrophyOutlined />} color="gold">
            最高: {record.longest_streak}
          </Tag>
        </Space>
      ),
    },
    {
      title: '总打卡',
      key: 'total_records',
      render: (_: any, record: Habit) => {
        const habitRecords = records[record.id] || [];
        return (
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span>{habitRecords.length} 次</span>
            {getTodayRecords(record.id) > 0 && (
              <Tag color="success">今日已打卡</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Habit) => (
        <Space>
          <Button onClick={() => toggleActive(record)}>
            {record.is_active ? '暂停' : '激活'}
          </Button>
          <Button icon={<EditOutlined />} onClick={() => openModal(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除" onConfirm={() => handleDelete(record.id)}>
            <Button icon={<DeleteOutlined />} danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="总习惯数" value={stats.total} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="进行中" value={stats.active} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="总打卡次数" value={stats.totalRecords} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="平均连续天数" value={stats.avgStreak} suffix="天" />
          </Card>
        </Col>
      </Row>

      <Card
        title="习惯打卡管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
            添加习惯
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Input
            placeholder="搜索习惯名称"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 200 }}
          />
        </Space>

        <Table
          columns={columns}
          dataSource={filteredHabits}
          loading={loading}
          rowKey="id"
          expandable={{
            expandedRowRender: (record: Habit) => {
              const habitRecords = records[record.id] || [];
              const recentRecords = habitRecords.slice(0, 10);
              return (
                <div style={{ padding: '16px 0' }}>
                  <h4>最近打卡记录</h4>
                  {recentRecords.length > 0 ? (
                    <Space wrap>
                      {recentRecords.map((c) => (
                        <Tag key={c.id} icon={<CalendarOutlined />}>
                          {dayjs(c.check_in_date).format('MM-DD HH:mm')}
                          {c.note && ` - ${c.note}`}
                        </Tag>
                      ))}
                    </Space>
                  ) : (
                    <span style={{ color: '#999' }}>暂无打卡记录</span>
                  )}
                </div>
              );
            },
          }}
        />
      </Card>

      <Modal
        title={editingHabit ? '编辑习惯' : '添加习惯'}
        open={modalVisible}
        onOk={form.submit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="user_id"
            label="用户ID"
            rules={[{ required: true, message: '请输入用户ID' }]}
          >
            <Input placeholder="请输入用户ID" />
          </Form.Item>
          <Form.Item
            name="name"
            label="习惯名称"
            rules={[{ required: true, message: '请输入习惯名称' }]}
          >
            <Input placeholder="例如：早起、阅读、运动" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="请输入描述" />
          </Form.Item>
          <Form.Item name="target_days" label="目标天数" rules={[{ required: true }]}>
            <Input type="number" placeholder="例如：21" />
          </Form.Item>
          <Form.Item name="is_active" label="激活状态" valuePropName="checked">
            <Switch defaultChecked />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Habits;
