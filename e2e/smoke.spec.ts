import { expect, test } from '@playwright/test';

test('compliance manager reviews the vault and files a missing COI', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page.getByText('Harborline Construction')).toBeVisible();
  await expect(page.getByTestId('stat-value-missing')).toHaveText('3');
  await expect(page.getByTestId('stat-value-expiring')).toHaveText('4');
  await expect(page.getByTestId('stat-value-expired')).toHaveText('1');
  await expect(page.getByTestId('stat-value-compliant')).toHaveText('7');

  await page.getByTestId('filter-missing').click();
  await page.getByTestId('requirement-req_harrow_gl').click();
  await expect(page.getByText('Harrow Hauling').filter({ visible: true })).toBeVisible();
  await page.getByTestId('add-document').click();
  await page.getByTestId('capture-sample').click();
  await expect(page.getByTestId('field-number')).toBeVisible();
  await page.getByTestId('field-number').fill('GL-HARBOR-100');
  await page.getByTestId('capture-submit').click();
  await expect(page.getByText('GL-HARBOR-100')).toBeVisible();
  await expect(page.getByText('Needs review')).toBeVisible();
  await page.getByTestId('back').click();

  await page.getByTestId('tab-alerts').click();
  await expect(page.getByText('Expiry alerts')).toBeVisible();
  await page.getByTestId('arm-reminders').click();
  await expect(page.getByText('4 reminders armed in this preview.')).toBeVisible();

  await page.getByTestId('tab-directory').click();
  await expect(page.getByTestId('directory-card-vendor_northstar')).toBeVisible();
  await page.getByTestId('directory-card-vendor_northstar').click();
  await expect(page.getByText('Priya Shah')).toBeVisible();
  await page.getByTestId('back').click();

  await page.getByTestId('tab-settings').click();
  await page.getByTestId('theme-dark').click();
  await page.getByTestId('settings-org-cedar-pine').click();
  await page.getByTestId('tab-vault').click();
  await page.getByTestId('filter-all').click();
  await expect(page.getByTestId('org-switcher')).toContainText('Cedar & Pine Interiors');
  await expect(page.getByTestId('stat-value-expiring')).toHaveText('1');
  await expect(page.getByTestId('stat-value-missing')).toHaveText('1');
  await expect(page.getByRole('button', { name: 'Maya Chen, Interior designer license, Expiring' })).toBeVisible();
  await expect(page.getByTestId('tab-directory')).toHaveCount(0);

  await page.getByTestId('tab-settings').click();
  await page.getByTestId('sign-out').click();
  await expect(page.getByRole('button', { name: 'Try the demo' })).toBeVisible();
});

test('an employee only sees their own requirements', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Leo Park · Employee' }).click();
  await expect(page.getByTestId('sign-in-email')).toHaveValue('leo@harborline.demo');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByTestId('org-switcher')).toContainText('Leo Park');
  await expect(page.getByText('OSHA 10 card')).toBeVisible();
  await expect(page.getByText('Northstar Electric')).toHaveCount(0);
  await expect(page.getByTestId('tab-directory')).toHaveCount(0);
});
