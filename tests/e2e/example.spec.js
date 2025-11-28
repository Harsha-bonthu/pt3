const { test, expect } = require('@playwright/test')

test('smoke: register, login, create item, verify via API', async ({ page }) => {
  await page.goto('/')
  const username = 'pwuser' + Date.now()
  const password = 'pwpass'
  // register/login via API and set token in localStorage for reliability
  await page.request.post('/api/register', { data: JSON.stringify({ username, password }), headers: { 'Content-Type': 'application/json' } }).catch(()=>{})
  const loginRes = await page.request.post('/api/login', { data: JSON.stringify({ username, password }), headers: { 'Content-Type': 'application/json' } })
  const loginJson = await loginRes.json()
  if (!loginJson || !loginJson.access_token) throw new Error('login failed')
  await page.evaluate(token => localStorage.setItem('pt3_token', token), loginJson.access_token)
  await page.goto('/')
  await page.waitForSelector('#btn-logout', { timeout: 10000 })
  // create item via API (reliable)
  const token = loginJson.access_token
  await page.request.post('/api/items', { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, data: JSON.stringify({ title: 'E2E Item', category: 'testcat', description: 'created by e2e' }) })
  // verify via API that the item exists (search by fetching items and checking category)
  const r2 = await page.request.get(`/api/items`, { headers: { 'Authorization': 'Bearer ' + token } })
  const items = await r2.json()
  const found = items.find(i => i.category === 'testcat' || (i.title && i.title.includes('E2E Item')))
  expect(found).toBeTruthy()
})
