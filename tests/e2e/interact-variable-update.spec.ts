import { test, expect } from '@playwright/test'

test('interact page shows character selection prompt', async ({ page }) => {
  await page.goto('/game/interact')
  await expect(page.getByText('选择一个角色')).toBeVisible()
})

test('interact page has mode selector when character selected', async ({ page }) => {
  await page.goto('/game/interact?character=测试角色')
  await expect(page.getByText('日常聊天')).toBeVisible()
})