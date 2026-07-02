# 组件使用规范文档

## 1. 概述

本文档为 `admin-client` 项目的组件与工具使用规范，旨在统一团队开发风格、减少重复代码、提升代码可维护性。

**适用范围：**

- 通用组件（`src/components/`）
- 自定义 Hooks（`src/hooks/`）
- 工具类（`src/utils/`）
- 跨所有层的通用开发约定

**核心原则：**

- 优先使用项目内置的通用组件和工具，避免重复造轮子
- 所有规范为强制性要求，除非有特殊原因并附注释说明
- 新增通用能力应抽象到对应目录，并在本文档中补充说明

---

## 2. 通用组件规范（`src/components/`）

### 2.1 ActionColumn — 通用表格操作列

**导出内容：** `ActionColumn` 组件 + `getActionColumn<T>()` 辅助函数

**接口定义：**

```typescript
interface ActionButton {
  key: string;
  label: string;
  icon?: React.ReactNode;
  type?: 'primary' | 'default' | 'link' | 'text';
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

interface ActionColumnProps {
  actions: ActionButton[];
  maxVisible?: number; // 默认 2
}

function getActionColumn<T>(
  renderActions: (record: T) => ActionButton[],
  options?: {
    width?: number;      // 默认 240
    maxVisible?: number;  // 默认 2
  }
): ColumnType<T>;
```

**使用规范：**

- **所有表格操作列必须使用 `getActionColumn`，禁止自行手写操作列。**
- `maxVisible` 默认为 2，超出部分自动放入"更多"下拉菜单。
- **禁止设置 `maxVisible > 3`。**
- 操作列固定宽度 240px，固定在表格右侧。
- 按钮排列优先级：最常用操作放前面（如编辑），危险操作（删除）放后面。
- `disabled` 按钮用于条件禁用场景（如已发布版本禁用回滚按钮）。

**示例：**

```typescript
const columns = [
  // ... 其他列
  getActionColumn<RecordType>((record) => [
    {
      key: 'edit',
      label: '编辑',
      icon: <EditOutlined />,
      onClick: () => handleEdit(record),
    },
    {
      key: 'delete',
      label: '删除',
      danger: true,
      onClick: () => handleDelete(record),
    },
  ]),
];
```

---

### 2.2 DataFormModal — 通用数据表单弹窗

**参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `open` | `boolean` | — | 弹窗开关 |
| `title` | `string` | — | 弹窗标题 |
| `mode` | `'create' \| 'edit'` | — | 创建或编辑模式 |
| `fields` | `FormField[]` | — | 表单字段配置 |
| `initialValues` | `Record<string, any>` | — | 编辑模式初始值 |
| `onOk` | `(values) => void` | — | 确认回调 |
| `onCancel` | `() => void` | — | 取消回调 |
| `confirmLoading` | `boolean` | — | 确认按钮加载状态 |
| `width` | `number` | `600` | 弹窗宽度 |
| `destroyOnClose` | `boolean` | `true` | 关闭时销毁内容 |
| `layout` | `'vertical' \| 'horizontal'` | `'vertical'` | 表单布局 |

**FormField 定义：**

```typescript
interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'date'
       | 'dateRange' | 'switch' | 'emoji' | 'tags';
  placeholder?: string;
  required?: boolean;
  rules?: Rule[];
  options?: SelectOption[];
  min?: number;
  max?: number;
  precision?: number;
  rows?: number;
  disabled?: boolean;
  defaultValue?: any;
  span?: number;
  dependencies?: string[];
  tooltip?: string;
  render?: (form) => React.ReactNode;
}
```

**使用规范：**

- 新增/编辑弹窗优先使用 `DataFormModal`，减少重复表单代码。
- 通过 `fields` 配置驱动表单渲染，避免为每个页面单独编写表单组件。

---

### 2.3 EditRecordModal — 通用记录编辑弹窗

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `open` | `boolean` | 弹窗开关 |
| `tableName` | `string` | 目标数据库表名 |
| `recordId` | `string \| number` | 记录 ID |
| `columns` | `ColumnConfig[]` | 字段配置 |
| `onCancel` | `() => void` | 取消回调 |
| `onSuccess` | `() => void` | 成功回调 |

**ColumnConfig 定义：**

```typescript
interface ColumnConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean' | 'textarea';
  options?: SelectOption[];
  rules?: Rule[];
}
```

**使用规范：**

- 简单的表记录编辑场景使用 `EditRecordModal`，无需手动编写表单和提交逻辑。
- 复杂表单（含联动、自定义渲染等）使用 `DataFormModal`。

---

### 2.4 FilterBar — 通用筛选栏

**参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `fields` | `FilterField[]` | — | 筛选字段配置 |
| `values` | `Record<string, any>` | — | 当前筛选值 |
| `onChange` | `(values) => void` | — | 值变更回调 |
| `onReset` | `() => void` | — | 重置回调 |
| `onSearch` | `() => void` | — | 搜索回调 |
| `showSearch` | `boolean` | `true` | 是否显示搜索按钮 |
| `searchText` | `string` | — | 搜索框文本 |
| `onSearchTextChange` | `(text) => void` | — | 搜索框文本变更回调 |
| `defaultCollapsed` | `boolean` | `true` | 默认折叠状态 |
| `loading` | `boolean` | — | 加载状态 |

**FilterField 定义：**

```typescript
interface FilterField {
  name: string;
  label: string;
  type: 'input' | 'select' | 'dateRange' | 'numberRange';
  options?: SelectOption[];
  placeholder?: string;
  span?: number;
}
```

**使用规范：**

- **所有列表页的筛选功能统一使用 `FilterBar`**，禁止自行拼接筛选 UI。
- 筛选条件通过 `onChange` 回调传递，由页面组件下推到数据库查询。

---

### 2.5 TagsCell — 标签展示

**参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `tags` | `string[] \| string \| null \| undefined` | — | 标签数据 |
| `color` | `string` | `'blue'` | 标签颜色 |
| `max` | `number` | `3` | 最大展示数量 |

**使用规范：**

- 表格中展示标签/分类列表时使用 `TagsCell`。
- 超出 `max` 数量的标签会自动折叠为 `+N` 提示。

---

### 2.6 UserDimensionList — 用户维度数据列表

**ModuleConfig 定义：**

```typescript
interface ModuleConfig {
  key: string;
  title: string;
  tableName: string;
  detailColumns: ColumnConfig[];
  detailTitle?: string;
  onUserSelect?: (userId: string) => void;
}
```

**参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `moduleConfig` | `ModuleConfig` | — | 模块配置 |
| `pageSizeOptions` | `string[]` | `['10','20','30','50','100']` | 分页选项 |
| `defaultPageSize` | `number` | `10` | 默认每页条数 |

**使用规范：**

- 需要按用户维度展示数据时使用 `UserDimensionList`。
- **注意：** 有 10000 条最大拉取限制，数据量过大时需考虑分批处理或后端优化。

---

### 2.7 AuthGuard — 路由鉴权守卫

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `children` | `React.ReactNode` | 受保护的子组件 |

**使用规范：**

- **需要登录才能访问的页面必须用 `AuthGuard` 包裹。**
- 未登录用户会被自动重定向到登录页。

**示例：**

```typescript
<AuthGuard>
  <Dashboard />
</AuthGuard>
```

---

### 2.8 NoPermission — 无权限提示

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `module` | `string` | 模块名称，用于提示信息 |

**使用规范：**

- 当用户无权访问某模块时，显示 `NoPermission` 组件。
- 通常与 `usePermission` Hook 配合使用。

---

## 3. 自定义 Hooks 规范（`src/hooks/`）

### 3.1 usePagination — 分页状态管理

**返回值：**

```typescript
const {
  pagination,       // Ant Design Table pagination 配置
  tablePagination,  // 适配 Table 组件的 pagination prop
  handlePageChange, // 页码/每页条数变更处理
  resetPage,        // 重置到第一页
  setTotal,         // 设置总条数
} = usePagination();
```

**使用规范：**

- **所有表格分页必须使用此 Hook，禁止自行管理分页状态。**
- **注意：** `useMemo` 依赖使用 `pagination.current` 和 `pagination.pageSize`，不要依赖整个 `pagination` 对象，避免不必要的重渲染。

**示例：**

```typescript
const { pagination, tablePagination, handlePageChange, resetPage, setTotal } = usePagination();

const fetchData = useCallback(async () => {
  const { data, total } = await service.paginate(pagination.current, pagination.pageSize, filters);
  setTotal(total);
  setData(data);
}, [pagination.current, pagination.pageSize, filters]); // 依赖具体值，非整个对象
```

---

### 3.2 usePermission — 权限检查

**返回值：**

```typescript
const {
  hasPermission,          // (permission: string) => boolean
  hasModulePermission,    // (module: string, action: string) => boolean
  isSuperAdmin,           // boolean
  isAdmin,                // boolean
  canWriteUsers,          // boolean
  canReadExpenses,        // boolean
  // ... 其他权限判断
} = usePermission();
```

**使用规范：**

- **所有权限判断必须通过此 Hook，禁止硬编码角色判断。**
- 页面级权限控制配合 `AuthGuard` 和 `NoPermission` 使用。
- 按钮级权限控制通过 `hasPermission` / `hasModulePermission` 判断。

**示例：**

```typescript
const { hasModulePermission } = usePermission();

// 正确
{hasModulePermission('users', 'write') && <Button>编辑</Button>}

// 错误 — 禁止硬编码角色
{userRole === 'admin' && <Button>编辑</Button>}
```

---

### 3.3 useDictOptions — 字典选项

**返回值：**

```typescript
// useDictOptions
const { options, loading } = useDictOptions(dictKey);

// useDictColors
const { colorMap, getColor, loading } = useDictColors(dictKey);
```

**使用规范：**

- 下拉选项和颜色映射优先使用字典服务获取，有 fallback 降级机制。
- 字典数据有 5 分钟缓存，重复请求不会触发额外网络请求。

**示例：**

```typescript
const { options: statusOptions } = useDictOptions('user_status');
const { getColor: getStatusColor } = useDictColors('user_status');
```

---

### 3.4 useEditModal — 编辑弹窗状态

**返回值：**

```typescript
const {
  editModalOpen,   // boolean — 弹窗是否打开
  editingRecord,   // T | null — 当前编辑的记录
  open,            // (record: T) => void — 打开弹窗
  close,           // () => void — 关闭弹窗
} = useEditModal<T>();
```

**使用规范：**

- 编辑弹窗的状态管理统一使用此 Hook，避免每个页面重复定义 `useState`。

**示例：**

```typescript
const { editModalOpen, editingRecord, open, close } = useEditModal<User>();

// 打开编辑弹窗
<Button onClick={() => open(record)}>编辑</Button>;

// 弹窗组件
<EditModal
  open={editModalOpen}
  record={editingRecord}
  onCancel={close}
  onSuccess={() => { close(); fetchData(); }}
/>;
```

---

## 4. 工具类规范（`src/utils/`）

### 4.1 BaseService — 通用 CRUD 基类

**构造函数：**

```typescript
const service = new BaseService<T>(tableName, {
  defaultOrder?: {
    column: string;
    ascending?: boolean; // 默认 false
  }
});
```

**方法列表：**

| 方法 | 说明 |
|------|------|
| `findAll(filters?)` | 查询所有记录 |
| `findById(id)` | 根据 ID 查询单条记录 |
| `paginate(page, pageSize, filters?)` | 分页查询，返回 `{ data, total }` |
| `create(data)` | 创建记录 |
| `update(id, data)` | 更新记录 |
| `delete(id)` | 删除记录 |
| `batchDelete(ids)` | 批量删除 |
| `batchUpdate(updates)` | 批量更新 |

**使用规范：**

- **所有数据 CRUD 操作必须通过 `BaseService`，禁止直接使用 `supabase.from()`。**
- **注意：** `paginate` 返回 `{ data, total }`，其中 `total` 来自独立的 count 查询，非前端计算。
- 每个数据表对应一个 Service 实例，在页面顶层创建。

**示例：**

```typescript
const userService = new BaseService<User>('users', {
  defaultOrder: { column: 'created_at', ascending: false },
});

// 正确
const { data, total } = await userService.paginate(page, pageSize, filters);

// 错误 — 禁止直接使用 supabase
const { data } = await supabase.from('users').select('*');
```

---

### 4.2 apiQuery / apiExecute — 快捷查询/执行

**使用规范：**

- 非标准 CRUD 操作（如调用 RPC 函数、复杂联表查询等）使用 `apiQuery` / `apiExecute`。
- 标准 CRUD 操作一律通过 `BaseService`。

---

### 4.3 handleApiError — 统一异常处理

**使用规范：**

- **所有 `catch` 块中必须调用 `handleApiError`，禁止 `console.error` 后静默处理。**
- `handleApiError` 会自动将错误信息展示给用户（通常通过 `message.error`）。

**示例：**

```typescript
try {
  await userService.create(formData);
  message.success('创建成功');
} catch (error) {
  handleApiError(error); // 正确
}

// 错误 — 禁止静默吞掉错误
try {
  await userService.create(formData);
} catch (error) {
  console.error(error); // 禁止
}
```

---

### 4.4 supabase — Supabase 客户端

**使用规范：**

- **Supabase 客户端只在 `BaseService` 内部使用，页面组件禁止直接 `import supabase`。**
- 特殊情况（如非标准查询）需直接使用时，应在代码中添加注释说明原因。

---

### 4.5 dictService — 字典服务

**使用规范：**

- 下拉选项统一通过字典服务获取，配合 `useDictOptions` / `useDictColors` Hooks 使用。
- 字典数据有 5 分钟客户端缓存，减少重复请求。

---

### 4.6 export — 数据导出

**导出方法：**

```typescript
exportToCSV<T>(data: T[], columns: ExportColumn[], filename?: string): void;
exportToExcel<T>(data: T[], columns: ExportColumn[], filename?: string): void;
```

**使用规范：**

- 导出功能统一使用此工具，禁止自行实现 CSV/Excel 生成逻辑。
- `columns` 配置与表格列保持一致，确保导出数据与页面展示一致。

---

### 4.7 format — 日期格式化

**方法列表：**

```typescript
formatDateTime(date: string | Date): string;  // 格式: YYYY-MM-DD HH:mm:ss
formatDate(date: string | Date): string;       // 格式: YYYY-MM-DD
dateSorter(field: string): (a, b) => number;    // 表格日期排序器
```

**使用规范：**

- **表格中日期列统一使用 `formatDateTime` / `formatDate` 渲染。**
- 日期排序使用 `dateSorter` 辅助函数。

**示例：**

```typescript
{
  title: '创建时间',
  dataIndex: 'created_at',
  sorter: dateSorter('created_at'),
  render: (val) => formatDateTime(val),
}
```

---

## 5. 通用开发规范

### 5.1 TypeScript 接口规范

- 接口字段名必须与数据库表字段**完全一致**（`snake_case`）。
- 可选字段使用 `?` 标注。
- **禁止使用 `as any` 绕过类型检查**，特殊情况需添加注释说明原因。

```typescript
// 正确
interface User {
  id: string;
  user_name: string;
  avatar_url?: string;
  created_at: string;
}

// 错误 — 字段名与数据库不一致
interface User {
  id: string;
  userName: string;  // 应为 user_name
}
```

---

### 5.2 API 调用规范

- 所有数据操作通过 `BaseService`，禁止直接使用 `supabase.from()`。
- **筛选条件下推到数据库查询，禁止前端过滤后分页。**
- 分页使用 `usePagination` Hook。

```typescript
// 正确 — 条件下推到数据库
const { data, total } = await userService.paginate(page, pageSize, {
  status: 'active',
  keyword: searchValue,
});

// 错误 — 前端过滤后分页
const allData = await userService.findAll();
const filtered = allData.filter(item => item.status === 'active');
const paged = filtered.slice(offset, offset + pageSize);
```

---

### 5.3 表格列规范

- **操作列必须使用 `getActionColumn`**，禁止手写。
- `maxVisible` 默认 2，最多 3。
- 日期列使用 `formatDateTime` / `formatDate` 渲染。
- 标签列使用 `TagsCell` 组件渲染。

---

### 5.4 表单规范

- `number` 类型字段使用 `InputNumber` 组件，**禁止使用 `Input type="number"`**。
- 日期字段使用 `DatePicker` 组件，格式化为 `YYYY-MM-DD HH:mm:ss`。

```typescript
// 正确
{ name: 'age', type: 'number', label: '年龄' }

// 错误
<input type="number" />
```

---

### 5.5 错误处理规范

- **所有 `async` 操作必须 `try-catch`。**
- `catch` 中调用 `handleApiError`。
- **禁止静默吞掉错误**（`catch` 块为空或仅 `console.error`）。

---

### 5.6 状态管理规范

- `useMemo` / `useCallback` 依赖使用具体值，不要依赖整个对象。

```typescript
// 正确
useMemo(() => compute(pagination.current, pagination.pageSize), [
  pagination.current,
  pagination.pageSize,
]);

// 错误 — 依赖整个对象会导致不必要的重渲染
useMemo(() => compute(pagination), [pagination]);
```

- `useState` 初始化避免昂贵计算，必要时使用惰性初始化。

```typescript
// 正确 — 惰性初始化
const [value, setValue] = useState(() => expensiveCompute());

// 错误 — 每次渲染都会执行
const [value, setValue] = useState(expensiveCompute());
```

---

### 5.7 命名规范

| 类别 | 规范 | 示例 |
|------|------|------|
| 组件文件 | `PascalCase.tsx` | `ActionColumn.tsx` |
| Hook 文件 | `camelCase.ts`（`use` 开头） | `usePagination.ts` |
| 工具文件 | `camelCase.ts` | `format.ts` |
| 接口/类型 | `PascalCase` | `ActionButton`、`FormField` |
| 变量/函数 | `camelCase` | `handlePageChange`、`editModalOpen` |
| 常量 | `UPPER_SNAKE_CASE` | `MAX_VISIBLE_COUNT` |
| 数据库字段 | `snake_case` | `created_at`、`user_name` |
