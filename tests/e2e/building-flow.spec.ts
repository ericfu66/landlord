import { test, expect } from '@playwright/test'

test('building page shows floor view', async ({ page }) => {
  await page.goto('/game/building')
  await expect(page.getByText('基建管理')).toBeVisible()
  await expect(page.getByText('新建楼层')).toBeVisible()
})

test('can select floors', async ({ page }) => {
  await page.goto('/game/building')
  await expect(page.getByText('1 楼')).toBeVisible()
})