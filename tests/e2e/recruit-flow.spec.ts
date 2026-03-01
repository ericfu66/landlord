import { test, expect } from '@playwright/test'

test('recruit flow requires room assignment', async ({ page }) => {
  await page.goto('/game/recruit')
  await expect(page.getByText('招募租客')).toBeVisible()
})

test('game page shows navigation', async ({ page }) => {
  await page.goto('/game')
  await expect(page.getByText('房东模拟器')).toBeVisible()
  await expect(page.getByText('我的租客')).toBeVisible()
  await expect(page.getByText('招募租客')).toBeVisible()
})

test('login page renders', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByText('登录')).toBeVisible()
})

test('register page renders', async ({ page }) => {
  await page.goto('/register')
  await expect(page.getByText('注册')).toBeVisible()
})