import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button, Result } from 'antd'

interface Props {
  children: ReactNode
  /** 是否为全局兜底（白屏场景），默认 false 为页面级 */
  global?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
}

// 管理后台错误边界组件
// 页面级：单页面崩溃不影响侧边栏和 Header
// 全局级：兜底白屏场景
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.global) {
        return (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
          }}>
            <Result
              status="error"
              title="应用出错了"
              subTitle="页面加载时发生了未知错误，请尝试刷新页面。"
              extra={
                <Button type="primary" onClick={() => window.location.reload()}>
                  刷新页面
                </Button>
              }
            />
          </div>
        )
      }

      return (
        <Result
          status="warning"
          title="页面出错了"
          subTitle="当前页面渲染时发生了错误，请尝试重试或切换到其他页面。"
          extra={
            <Button type="primary" onClick={this.handleRetry}>
              重试
            </Button>
          }
        />
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
