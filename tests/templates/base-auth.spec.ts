import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Use Google Sheets Directly' }).click();
  await page.getByRole('textbox', { name: 'Email or phone' }).fill('fauzanahmad899@gmail.com');
  await page.getByRole('textbox', { name: 'Email or phone' }).press('Enter');
  await page.locator('div').filter({ hasText: /^Try again$/ }).first().click();
  await page.getByRole('link', { name: 'Try again' }).click();
  await page.goto('http://localhost:3000/');
  await page.locator('.group\\/button.inline-flex.shrink-0.items-center.justify-center.border.border-transparent.bg-clip-padding.font-medium.whitespace-nowrap.transition-all.outline-none.select-none.focus-visible\\:border-ring.focus-visible\\:ring-3.focus-visible\\:ring-ring\\/50.active\\:not-aria-\\[haspopup\\]\\:translate-y-px.disabled\\:pointer-events-none.disabled\\:opacity-50.aria-invalid\\:border-destructive.aria-invalid\\:ring-3.aria-invalid\\:ring-destructive\\/20.dark\\:aria-invalid\\:border-destructive\\/50.dark\\:aria-invalid\\:ring-destructive\\/40.\\[\\&_svg\\]\\:pointer-events-none.\\[\\&_svg\\]\\:shrink-0.cursor-pointer.hover\\:text-foreground.aria-expanded\\:bg-muted.aria-expanded\\:text-foreground.gap-1').click();
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'name@example.com' }).click();
  await page.getByRole('textbox', { name: 'name@example.com' }).fill('fauzanahmad899@gmail.com');
  await page.getByRole('textbox', { name: 'name@example.com' }).press('Tab');
  await page.getByRole('button', { name: 'Forgot Password?' }).press('Tab');
  await page.getByRole('textbox', { name: '••••••••' }).fill('L0sts4g@');
  await page.getByRole('textbox', { name: '••••••••' }).press('Enter');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByText('Rp 3.754Click for details').click();
  await page.locator('header').filter({ hasText: 'Detailed DashboardJuli 2026▼' }).getByRole('button').click();
});