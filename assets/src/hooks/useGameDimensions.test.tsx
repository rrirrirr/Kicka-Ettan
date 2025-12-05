import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGameDimensions } from './useGameDimensions';
import { SHEET_WIDTH, VIEW_TOP_OFFSET, VIEW_BOTTOM_OFFSET } from '../utils/constants';
import React from 'react';

// Mock ResizeObserver
const observeMock = vi.fn();
const disconnectMock = vi.fn();
const unobserveMock = vi.fn();

// Mock as a class
class MockResizeObserver {
    observe = observeMock;
    disconnect = disconnectMock;
    unobserve = unobserveMock;
    constructor(callback: any) {
        (global.ResizeObserver as any).callback = callback;
    }
}

global.ResizeObserver = MockResizeObserver as any;

const TestComponent = ({ onDimensionsChange }: { onDimensionsChange: (dims: any) => void }) => {
    const { containerRef, sheetDimensions, scale } = useGameDimensions();

    React.useEffect(() => {
        onDimensionsChange({ sheetDimensions, scale });
    }, [sheetDimensions, scale, onDimensionsChange]);

    return <div ref={containerRef} id="container" />;
};

describe('useGameDimensions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset offsetWidth/Height mocks
        Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 0 });
        Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 0 });
    });

    it('should initialize with zero dimensions', () => {
        const onDimensionsChange = vi.fn();
        render(<TestComponent onDimensionsChange={onDimensionsChange} />);

        expect(onDimensionsChange).toHaveBeenCalledWith({
            sheetDimensions: { width: 0, height: 0 },
            scale: 1
        });
    });

    it('should update dimensions when container is resized', () => {
        const onDimensionsChange = vi.fn();

        // Mock dimensions
        Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 1000 });
        Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 2000 });

        render(<TestComponent onDimensionsChange={onDimensionsChange} />);

        // Trigger ResizeObserver callback
        act(() => {
            if ((global.ResizeObserver as any).callback) {
                (global.ResizeObserver as any).callback([]);
            }
        });

        const expectedScaleWidth = 1000 / SHEET_WIDTH;
        const expectedScaleHeight = 2000 / (VIEW_TOP_OFFSET + VIEW_BOTTOM_OFFSET);
        const expectedScale = Math.min(expectedScaleWidth, expectedScaleHeight);

        expect(onDimensionsChange).toHaveBeenLastCalledWith({
            sheetDimensions: {
                width: SHEET_WIDTH * expectedScale,
                height: (VIEW_TOP_OFFSET + VIEW_BOTTOM_OFFSET) * expectedScale
            },
            scale: expectedScale
        });
    });

    it('should disconnect observer on unmount', () => {
        const { unmount } = render(<TestComponent onDimensionsChange={vi.fn()} />);
        unmount();
        expect(disconnectMock).toHaveBeenCalled();
    });
});
