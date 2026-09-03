import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import App from './App'
import ErrorBoundary from './components/common/ErrorBoundary'
import './index.css'

// 设置 dayjs 为中文
dayjs.locale('zh-cn')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary global>
      <ConfigProvider
        locale={zhCN}
      >
        <BrowserRouter
          basename="/pure-enjoy-admin"
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </BrowserRouter>
      </ConfigProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
