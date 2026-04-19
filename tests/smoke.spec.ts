import { expect, test } from '@playwright/test';

test.describe('Aether Command RTS — smoke', () => {
  test('boots and renders core UI', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');

    await expect(page).toHaveTitle('Aether Command RTS');
    await expect(page.locator('#gameCanvas')).toBeVisible();
    await expect(page.locator('#gold-val')).toHaveText('500');
    await expect(page.locator('#mode-pan')).toHaveClass(/active-mode/);

    // give the loop a frame to tick
    await page.waitForTimeout(200);
    expect(errors).toEqual([]);
  });

  test('switches between pan and select modes', async ({ page }) => {
    await page.goto('/');

    const panBtn = page.locator('#mode-pan');
    const selectBtn = page.locator('#mode-select');

    await selectBtn.click();
    await expect(selectBtn).toHaveClass(/active-mode/);
    await expect(panBtn).not.toHaveClass(/active-mode/);

    await panBtn.click();
    await expect(panBtn).toHaveClass(/active-mode/);
    await expect(selectBtn).not.toHaveClass(/active-mode/);
  });
});
