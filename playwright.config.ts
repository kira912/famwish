import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'node:fs'

const systemChrome = '/usr/bin/google-chrome'
const useSystemChrome = existsSync(systemChrome)

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  timeout: 45000,
  use: {
    baseURL: 'http://localhost:3123',
    trace: 'on-first-retry',
     ...(useSystemChrome ? { launchOptions: { executablePath: systemChrome } } : {})
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: 'node .output/server/index.mjs',
    env: {
      PORT: '3123',
      HOST: '127.0.0.1',
      POSTGRES_URL: '',
      DATABASE_URL: ''
    },
    url: 'http://localhost:3123',
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  }
})
