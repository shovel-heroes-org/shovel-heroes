import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
 * @deprecated 此 hook 已棄用，請改用 useBreakpoint() hook
 * 
 * 建議遷移方式：
 * ```js
 * // 舊的寫法
 * const isMobile = useIsMobile();
 * 
 * // 新的寫法
 * import { useBreakpoint } from "@/hooks/use-breakpoint";
 * const { isMobile } = useBreakpoint();
 * ```
 * 
 * useBreakpoint 提供更完整的裝置類型檢測：
 * - isMobile: 手機裝置 (< 768px)
 * - isTablet: 平板裝置 (768px ~ 1023px) 
 * - isDesktop: 桌機裝置 (≥ 1024px)
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange);
  }, [])

  return !!isMobile
}
