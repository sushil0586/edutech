import { chromium } from '@playwright/test';

const baseUrl = 'http://localhost:3000';
const apiBaseUrl = 'http://127.0.0.1:9001';
const username = process.env.PLAYWRIGHT_ADMIN_USERNAME || 'demo-platform-admin';
const password = process.env.PLAYWRIGHT_ADMIN_PASSWORD || 'Demo@12345';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
page.on('response', async (res) => {
  if (res.request().method() === 'POST' && /\/admin\/exams\/new/.test(res.url())) {
    console.log('STATUS', res.status());
    console.log('HEADERS', JSON.stringify(res.headers(), null, 2));
    try { console.log('BODY', (await res.text()).slice(0, 800)); } catch {}
  }
});

const login = await page.request.post(`${apiBaseUrl}/api/v1/auth/login/`, {
  data: { username, password },
  headers: { 'Content-Type': 'application/json' },
});
const auth = await login.json();
await context.addCookies([
  { name: 'nexora_access_token', value: auth.access, url: baseUrl, httpOnly: true, sameSite: 'Lax', secure: false },
  { name: 'nexora_refresh_token', value: auth.refresh, url: baseUrl, httpOnly: true, sameSite: 'Lax', secure: false },
]);

const uniqueSeed = Date.now();
await page.goto(`${baseUrl}/admin/exams/new`);
await page.locator('.academicInstituteChip').filter({ hasText: /Demo Learning Institute|DLI001/i }).first().click();
await page.getByRole('textbox', { name: /exam title/i }).fill(`Debug Quiz ${uniqueSeed}`);
await page.getByRole('textbox', { name: /exam code/i }).fill(`DBG-QZ-${uniqueSeed}`);
await page.locator('select[name="source_type"]').selectOption('platform');
const academicYear = page.locator('select[name="academic_year"]').first();
if (await academicYear.evaluate((element) => Array.from(element.options).some((option) => option.label.trim() === '2026-2027'))) {
  await academicYear.selectOption({ label: '2026-2027' });
}
const program = page.locator('select[name="program"]').first();
const subject = page.locator('select[name="subject"]').first();
await page.waitForTimeout(1000);
const programOptions = await program.locator('option').evaluateAll((nodes) => nodes.map((n) => ({ value: n.value, label: (n.label || n.textContent || '').trim() })).filter((o) => o.value.trim()));
await program.selectOption((programOptions.find((o) => /^AWS Certified Practitioner(?:\s*\(|$)/i.test(o.label)) || programOptions[0]).value);
await page.waitForTimeout(1500);
const subjectOptions = await subject.locator('option').evaluateAll((nodes) => nodes.map((n) => ({ value: n.value, label: (n.label || n.textContent || '').trim() })).filter((o) => o.value.trim()));
await subject.selectOption((subjectOptions.find((o) => /^Cloud Practitioner Domains(?:\s*\(|$)/i.test(o.label)) || subjectOptions[0]).value);
await page.getByRole('button', { name: /^continue$/i }).click();
await page.locator('select[name="exam_type"]').selectOption('quiz');
await page.getByRole('button', { name: /^continue$/i }).click();
await page.getByRole('button', { name: /^continue$/i }).click();
await page.getByRole('button', { name: /create exam shell/i }).click();
await page.waitForTimeout(3000);
console.log('FINAL_URL', page.url());
await browser.close();
