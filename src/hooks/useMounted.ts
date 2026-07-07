import { useEffect, useRef, useCallback } from 'react'

/// mounted 钩子：用于异步操作中防止组件卸载后 setState
/// 用法：const mountedRef = useMounted()
///       if (!mountedRef.current) return
export function useMounted() {
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  return mountedRef
}

/// 安全回调包装：仅在组件挂载时执行回调
/// 用法：const safeSetState = useSafeCallback(setState)
///       safeSetState({ loading: false })
export function useSafeCallback<T extends (...args: any[]) => void>(callback: T): T {
  const mountedRef = useMounted()
  return useCallback(((...args: any[]) => {
    if (mountedRef.current) {
      callback(...args)
    }
  }) as T, [mountedRef, callback])
}
