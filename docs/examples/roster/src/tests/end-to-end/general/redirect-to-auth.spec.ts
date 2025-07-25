import { test, expect } from '@playwright/test';

test('Landing should redirect to auth', async ({ page }) => {
  await page.goto('/');

  // expect redirect to auth
  const redirect = page.url();
  expect(redirect).toContain('/auth/sign-in');

  await expect(page).toHaveTitle(/Roster/);

  // Check for input[name="phone"]
  const phoneInput = await page.$('input[name="phone"]');
  expect(phoneInput).not.toBeNull();
});
