/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  use: {
    baseURL: 'http://127.0.0.1:8000',
    headless: true,
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 800 }
  },
  testDir: 'tests/e2e'
}
module.exports = config
