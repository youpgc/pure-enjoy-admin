import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import App from './App'
import './index.css'

// 设置 dayjs 为中文
dayjs.locale('zh-cn')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      modal={{ styles: { content: { width: 1200 } } }}
    >
      <BrowserRouter basename="/pure-enjoy-admin">
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>,
)
