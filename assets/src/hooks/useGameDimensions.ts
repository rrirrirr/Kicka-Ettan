import { useState, useEffect, useRef } from 'react';
import { SHEET_WIDTH, VIEW_TOP_OFFSET, VIEW_BOTTOM_OFFSET } from '../utils/constants';

export const useGameDimensions = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [sheetDimensions, setSheetDimensions] = useState({ width: 0, height: 0 });
    const [scale, setScale] = useState(1);
    const [mounted, setMounted] = useState(false);

    // Force a re-render after mount to ensure ref is attached
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted || !containerRef.current) return;

        const updateDimensions = () => {
            if (containerRef.current) {
                const containerWidth = containerRef.current.offsetWidth;
                const containerHeight = containerRef.current.offsetHeight;

                if (containerWidth === 0 || containerHeight === 0) return;

                // Calculate available space
                const availableWidth = containerWidth;
                const availableHeight = containerHeight;

                // Calculate scale factors for both dimensions
                const scaleWidth = availableWidth / SHEET_WIDTH;
                const scaleHeight = availableHeight / (VIEW_TOP_OFFSET + VIEW_BOTTOM_OFFSET);

                // Use the smaller scale to ensure it fits completely
                const layoutScale = Math.min(scaleWidth, scaleHeight);

                const newWidth = SHEET_WIDTH * layoutScale;
                const newHeight = (VIEW_TOP_OFFSET + VIEW_BOTTOM_OFFSET) * layoutScale;

                // Only update if dimensions actually changed
                setSheetDimensions(prev => {
                    if (prev.width === newWidth && prev.height === newHeight) {
                        return prev;
                    }
                    return { width: newWidth, height: newHeight };
                });
                setScale(prev => {
                    if (prev === layoutScale) return prev;
                    return layoutScale;
                });
            }
        };

        const resizeObserver = new ResizeObserver(() => {
            updateDimensions();
        });

        resizeObserver.observe(containerRef.current);
        updateDimensions();

        // Also listen to window resize for viewport changes that might not trigger ResizeObserver
        window.addEventListener('resize', updateDimensions);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateDimensions);
        };
    }, [mounted]);

    return { containerRef, sheetDimensions, scale };
};
