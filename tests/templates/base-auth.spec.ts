import { test, expect } from '@playwright/test';

test('Base Authentication and Detailed Dashboard Navigation Flow', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  for (let i = 0; i < 6; i++) {
    await page.getByRole('button', { name: 'Next', exact: true }).click();
  }

  await page.getByRole('button', { name: /Sign In \/ Sign Up Account|Masuk \/ Daftar Akun/ }).click();
  await page.getByRole('textbox', { name: 'name@example.com' }).fill('fauzanahmad899@gmail.com');
  await page.getByRole('textbox', { name: '••••••••' }).fill('L0sts4g@');
  await page.getByRole('button', { name: /Sign In|Masuk/ }).click();

  const quickAddBtn = page.getByRole('button', { name: /Quick Add|Tambah Cepat/ });
  await expect(quickAddBtn).toBeVisible({ timeout: 15000 });

  await page.getByText(/Click for details|Klik untuk detail/i).click();
  await expect(page.getByText(/Detailed Dashboard|Dashboard Detail/i)).toBeVisible({ timeout: 15000 });
});