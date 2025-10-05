import * as React from "react";

// 直接對應 tailwind.config.js 中的 screens 設定
const screens = {
    xxs: "375px",
    xs: "510px",
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px",
};

// 將像素值轉換為數字，便於比較
const getPixelValue = (sizeString) =>
    parseInt(sizeString.replace("px", ""), 10);

// 根據螢幕寬度計算當前裝置類型
const calculateDeviceType = (width) => {
    const mdBreakpoint = getPixelValue(screens.md); // 768px
    const lgBreakpoint = getPixelValue(screens.lg); // 1024px

    return {
        isMobile: width <= mdBreakpoint, // < 768px (手機)
        isTablet: width > mdBreakpoint && width < lgBreakpoint, // 768px ~ 1023px (平板)
        isDesktop: width >= lgBreakpoint, // ≥ 1024px (桌機)
    };
};

/**
 * 根據預定義的螢幕尺寸追蹤當前裝置類型的 React hook。
 * 回傳一個包含裝置類型布林值的物件：
 * - isMobile: 手機裝置 (< 768px)
 * - isTablet: 平板裝置 (768px ~ 1023px)
 * - isDesktop: 桌機裝置 (≥ 1024px)
 *
 * 只在客戶端執行，避免 SSR 環境中 window 的問題。
 * 使用單一 resize 監聽器優化效能，避免多個 MediaQueryList 監聽器。
 *
 * @returns {Object} 包含裝置類型布林值的物件 {isMobile, isTablet, isDesktop}
 */
export function useBreakpoint() {
    const [deviceType, setDeviceType] = React.useState(() => {
        // 初始狀態：如果在伺服器端，回傳手機為預設；在客戶端，計算實際值
        if (typeof window === "undefined") {
            return {
                isMobile: true,
                isTablet: false,
                isDesktop: false,
            };
        }
        return calculateDeviceType(window.innerWidth);
    });

    React.useEffect(() => {
        // 只在客戶端執行，避免 SSR 環境中的問題
        if (typeof window === "undefined") {
            return;
        }

        // 使用節流來優化效能，避免過於頻繁的狀態更新
        let timeoutId = null;

        const handleResize = () => {
            // 清除之前的 timeout
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            // 設定新的 timeout，延遲 100ms 執行
            timeoutId = setTimeout(() => {
                const newDeviceType = calculateDeviceType(window.innerWidth);
                setDeviceType((prevDeviceType) => {
                    // 只有在實際變化時才更新狀態
                    const hasChanged = Object.keys(newDeviceType).some(
                        (key) => newDeviceType[key] !== prevDeviceType[key]
                    );
                    return hasChanged ? newDeviceType : prevDeviceType;
                });
            }, 100);
        };

        // 監聽 resize 事件而不是 media query 事件
        window.addEventListener("resize", handleResize);

        // 清理函式
        return () => {
            window.removeEventListener("resize", handleResize);
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, []);

    return deviceType;
}
