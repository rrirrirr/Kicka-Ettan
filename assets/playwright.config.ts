import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 1,
    workers: process.env.CI ? 1 : undefined,  // Default workers (usually 8) locally
    reporter: 'html',
    use: {
        baseURL: 'http://127.0.0.1:4002',
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
        },
        // WebKit and Mobile Safari disabled per user request
        // {
        //     name: 'webkit',
        //     use: { ...devices['Desktop Safari'] },
        // },
        {
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 5'] },
        },
        // {
        //     name: 'Mobile Safari',
        //     use: { ...devices['iPhone 12'] },
        // },
    ],
    webServer: {
        command: 'cd .. && MIX_ENV=test mix phx.server',
        url: 'http://127.0.0.1:4002',
        timeout: 120 * 1000,
        reuseExistingServer: !process.env.CI,
        stdout: 'pipe',
        stderr: 'pipe',
    },
});
