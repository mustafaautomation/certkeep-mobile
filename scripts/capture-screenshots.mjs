import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const baseURL = process.env.SCREENSHOT_URL ?? 'http://127.0.0.1:4173';
const outDir = path.resolve('docs/screenshots');

async function shot(page, name) {
  await page.screenshot({ path: path.join(outDir, name), fullPage: false });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await mkdir(outDir, { recursive: true });

await page.goto(baseURL);
await page.getByRole('button', { name: 'Try the demo' }).waitFor();
await shot(page, 'sign-in.png');

await page.getByRole('button', { name: 'Try the demo' }).click();
await page.getByText('Harborline Construction').waitFor();
await shot(page, 'dashboard.png');

await page.getByTestId('tab-directory').click();
await page.getByTestId('directory-card-vendor_northstar').waitFor();
await shot(page, 'directory.png');

await page.getByTestId('directory-card-vendor_northstar').click();
await page.getByText('Priya Shah').waitFor();
await shot(page, 'vendor.png');

await page.getByTestId('vendor-requirement-req_northstar_license').click();
await page.getByTestId('add-document').click();
await page.getByTestId('capture-sample').click();
await page.getByTestId('field-number').waitFor();
await page.getByTestId('field-number').scrollIntoViewIfNeeded();
await shot(page, 'confirm-extraction.png');

await page.getByTestId('back').last().click();
await page.getByTestId('back').last().click();
await page.getByTestId('tab-alerts').click();
await page.getByText('Expiry alerts').waitFor();
await shot(page, 'alerts.png');

await page.getByTestId('tab-settings').click();
await page.getByTestId('theme-dark').click();
await page.getByText('Appearance').waitFor();
await shot(page, 'settings-dark.png');

await browser.close();
console.log(`Wrote screenshots to ${outDir}`);
