import { renderHook, act } from '@testing-library/react';
import { SettingsProvider, useSettings } from './SettingsContext';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value.toString();
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        }
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

describe('SettingsContext Auto-detection', () => {
    const originalNavigator = window.navigator;

    beforeEach(() => {
        window.localStorage.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        // Restore navigator
        Object.defineProperty(window, 'navigator', {
            configurable: true,
            value: originalNavigator
        });
    });

    const mockNavigatorLanguage = (language: string) => {
        Object.defineProperty(window, 'navigator', {
            configurable: true,
            value: {
                ...originalNavigator,
                language: language,
                languages: [language]
            }
        });
    };

    it('defaults to imperial when browser language is en-US', () => {
        mockNavigatorLanguage('en-US');

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <SettingsProvider>{children}</SettingsProvider>
        );

        const { result } = renderHook(() => useSettings(), { wrapper });

        expect(result.current.unitSystem).toBe('imperial');
        expect(result.current.baseUnitSystem).toBe('imperial');
    });

    it('defaults to metric when browser language is sv-SE', () => {
        mockNavigatorLanguage('sv-SE');

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <SettingsProvider>{children}</SettingsProvider>
        );

        const { result } = renderHook(() => useSettings(), { wrapper });

        expect(result.current.unitSystem).toBe('metric');
        expect(result.current.baseUnitSystem).toBe('metric');
    });

    it('defaults to metric for other english locales like en-GB', () => {
        mockNavigatorLanguage('en-GB');

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <SettingsProvider>{children}</SettingsProvider>
        );

        const { result } = renderHook(() => useSettings(), { wrapper });

        expect(result.current.unitSystem).toBe('metric');
        expect(result.current.baseUnitSystem).toBe('metric');
    });

    it('persists selection after user manual change even if browser language implies otherwise', () => {
        // Start as US
        mockNavigatorLanguage('en-US');

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <SettingsProvider>{children}</SettingsProvider>
        );

        const { result, unmount } = renderHook(() => useSettings(), { wrapper });

        expect(result.current.unitSystem).toBe('imperial');

        // User changes to metric
        act(() => {
            result.current.updateUnitSystem('metric');
        });

        expect(result.current.unitSystem).toBe('metric');
        expect(window.localStorage.getItem('curling_unit_system')).toBe(JSON.stringify('metric'));

        unmount();

        // Reload (remount provider) - should still be metric despite local being US
        const { result: result2 } = renderHook(() => useSettings(), { wrapper });
        expect(result2.current.unitSystem).toBe('metric');
    });
});
