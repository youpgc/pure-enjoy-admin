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
  Select,
  DatePicker,
  Switch,
  message,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Calendar,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { supabase } from '../services/supabase';
import dayjs from 'dayjs';

interface Reminder {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  remind_at: string;
  is_completed: boolean;
  priority: 'low' | 'normal' | 'high';
  created_at: string;
  username?: string;
}

const priorityOptions = [
  { label: '高', value: 'high', color: 'red' },
  { label: '中', value: 'normal', color: 'orange' },
  { label: '低', value: 'low', color: 'green' },
];

const Reminders: React.FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [form] = Form.useForm();
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    highPriority: 0,
  });

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_reminders')
        .select(`
          *,
          users:user_id (username)
        `)
        .order('is_completed', { ascending: true })
        .order('remind_at', { ascending: true });

      if (error) throw error;

      const formattedData = (data || []).map((item: any) => ({
        ...item,
        username: item.users?.username || '未知用户',
      }));

      setReminders(formattedData);
      calculateStats(formattedData);
    } catch (error) {
      message.error('获取提醒列表失败');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: Reminder[]) => {
    setStats({
      total: data.length,
      pending: data.filter((i) => !i.is_completed).length,
      completed: data.filter((i) => i.is_completed).length,
      highPriority: data.filter((i) => i.priority === 'high' && !i.is_completed).length,
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      const payload = {
        ...values,
        remind_at: values.remind_at.toISOString(),
      };

      if (editingReminder) {
        const { error } = await supabase
          .from('user_reminders')
          .update(payload)
          .eq('id', editingReminder.id);
        if (error) throw error;
        message.success('更新成功');
      } else {
        const { error } = await supabase.from('user_reminders').insert([payload]);
        if (error) throw error;
        message.success('创建成功');
      }

      setModalVisible(false);
      form.resetFields();
      setEditingReminder(null);
      fetchReminders();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('user_reminders').delete().eq('id', id);
      if (error) throw error;
      message.success('删除成功');
      fetchReminders();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const toggleComplete = async (record: Reminder) => {
    try {
      const { error } = await supabase
        .from('user_reminders')
        .update({ is_completed: !record.is_completed })
        .eq('id', record.id);
      if (error) throw error;
      message.success(record.is_completed ? '标记为未完成' : '标记为已完成');
      fetchReminders();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const openModal = (record?: Reminder) => {
    if (record) {
      setEditingReminder(record);
      form.setFieldsValue({
        ...record,
        remind_at: dayjs(record.remind_at),
      });
    } else {
      setEditingReminder(null);
      form.resetFields();
      form.setFieldsValue({ priority: 'normal', remind_at: dayjs() });
    }
    setModalVisible(true);
  };

  const filteredReminders = reminders.filter((item) => {
    const matchSearch =
      !searchText ||
      item.title.toLowerCase().includes(searchText.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchText.toLowerCase());
    const matchStatus =
      !statusFilter ||
      (statusFilter === 'completed' && item.is_completed) ||
      (statusFilter === 'pending' && !item.is_completed);
    return matchSearch && matchStatus;
  });

  const getCalendarData = (value: dayjs.Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD');
    return reminders.filter((r) => dayjs(r.remind_at).format('YYYY-MM-DD') === dateStr);
  };

  const dateCellRender = (value: dayjs.Dayjs) => {
    const listData = getCalendarData(value);
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {listData.map((item) => (
          <li key={item.id}>
            <Badge
              status={item.is_completed ? 'default' : item.priority === 'high' ? 'error' : 'warning'}
              text={item.title}
            />
          </li>
        ))}
      </ul>
    );
  };

  const columns = [
    {
      title: '状态',
      dataIndex: 'is_completed',
      key: 'is_completed',
      width: 80,
      render: (completed: boolean, record: Reminder) => (
        <Button
          type={completed ? 'primary' : 'default'}
          icon={<CheckCircleOutlined />}
          onClick={() => toggleComplete(record)}
          size="small"
        >
          {completed ? '已完成' : '完成'}
        </Button>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Reminder) => (
        <span style={{ textDecoration: record.is_completed ? 'line-through' : 'none' }}>
          {text}
        </span>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => {
        const p = priorityOptions.find((o) => o.value === priority);
        return <Tag color={p?.color}>{p?.label}</Tag>;
      },
    },
    {
      title: '提醒时间',
      dataIndex: 'remind_at',
      key: 'remind_at',
      render: (date: string) => {
        const d = dayjs(date);
        const isOverdue = d.isBefore(dayjs()) && !d.isSame(dayjs(), 'day');
        return (
          <span style={{ color: isOverdue ? 'red' : 'inherit' }}>
            {d.format('YYYY-MM-DD HH:mm')}
          </span>
        );
      },
    },
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Reminder) => (
        <Space>
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
            <Statistic title="总提醒数" value={stats.total} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="待办" value={stats.pending} valueStyle={{ color: '#cf1322' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="已完成" value={stats.completed} valueStyle={{ color: '#3f8600' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="高优先级" value={stats.highPriority} valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
      </Row>

      <Card
        title="提醒事项管理"
        extra={
          <Space>
            <Button
              icon={viewMode === 'list' ? <CalendarOutlined /> : <UnorderedListOutlined />}
              onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
            >
              {viewMode === 'list' ? '日历视图' : '列表视图'}
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
              添加提醒
            </Button>
          </Space>
        }
      >
        {viewMode === 'list' ? (
          <>
            <Space style={{ marginBottom: 16 }}>
              <Input
                placeholder="搜索标题或描述"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 200 }}
              />
              <Select
                placeholder="筛选状态"
                allowClear
                style={{ width: 120 }}
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { label: '待办', value: 'pending' },
                  { label: '已完成', value: 'completed' },
                ]}
              />
            </Space>

            <Table
              columns={columns}
              dataSource={filteredReminders}
              loading={loading}
              rowKey="id"
            />
          </>
        ) : (
          <Calendar dateCellRender={dateCellRender} />
        )}
      </Card>

      <Modal
        title={editingReminder ? '编辑提醒' : '添加提醒'}
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
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入提醒标题" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="请输入描述" />
          </Form.Item>
          <Form.Item
            name="remind_at"
            label="提醒时间"
            rules={[{ required: true, message: '请选择提醒时间' }]}
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="priority" label="优先级" rules={[{ required: true }]}>
            <Select options={priorityOptions} />
          </Form.Item>
          <Form.Item name="is_completed" label="已完成" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Reminders;
