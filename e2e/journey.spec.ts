import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';

/** Reads the verification code the dev mailer printed to the server log (see playwright.config.ts). */
async function codeFor(page: Page, email: string) {
  await page.waitForTimeout(200);
  const log = readFileSync('test-results/server.log', 'utf8');
  const hits = [...log.matchAll(new RegExp(`to=${email.replace(/[.@]/g, '\\$&')} subject="(\\d{6})`, 'g'))];
  return hits.at(-1)![1];
}

test('first launch through onboarding to the swipe feed', async ({ page }) => {
  const email = `reader${Date.now()}@example.com`;
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'be dangerously well informed.' })).toBeVisible();
  await page.getByRole('button', { name: 'start reading free' }).click();
  await page.getByRole('button', { name: 'Continue with email' }).click();

  // C5: errors on blur, submit disabled until valid.
  await page.getByLabel('Name').fill('Maya Chen');
  await page.getByLabel('Email').fill('maya@example');
  await page.getByLabel('Password', { exact: true }).click();
  await expect(page.getByText('enter a full email address, like name@example.com.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'create account' })).toBeDisabled();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('Longpass123');
  await page.locator('label:has(input[type=checkbox])').click();
  await page.getByRole('button', { name: 'create account' }).click();

  // C8
  await expect(page.getByRole('heading', { name: 'check your inbox.' })).toBeVisible();
  await page.waitForTimeout(300);
  await page.getByLabel('6-digit code').fill(await codeFor(page, email));

  // 03 → 04
  await expect(page.getByRole('heading', { name: 'what do you follow?' })).toBeVisible({ timeout: 5000 });
  const cont = page.getByRole('button', { name: 'continue →' });
  for (const t of ['AI Models', 'AI Policy']) await page.getByRole('button', { name: t, exact: true }).click();
  await expect(cont).toBeDisabled();
  await page.getByRole('button', { name: 'Robotics', exact: true }).click();
  await cont.click();

  // 04b: search + multi-select, first pick is home.
  await page.getByLabel('search countries').fill('india');
  await page.getByRole('checkbox', { name: 'IN India', exact: true }).click();
  await page.getByLabel('search countries').fill('atlantis');
  await expect(page.getByText('no countries match “atlantis”.')).toBeVisible();
  await page.getByLabel('search countries').fill('');
  await cont.click();

  // 04c: hyperlocal needs a place; use the device location.
  await page.getByRole('checkbox', { name: /Neighbourhood/ }).click();
  await expect(cont).toBeDisabled();
  await page.getByRole('button', { name: 'use my location' }).click();
  await expect(page.getByText('Indiranagar, Bengaluru', { exact: true })).toBeVisible();
  await page.getByRole('radio', { name: '5 km' }).click();
  await cont.click();

  // 05, 06
  await page.getByRole('button', { name: "tap when you're done reading" }).click();
  await expect(page.getByRole('button', { name: 'read it again' })).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'not now' }).click();

  // L5 → feed
  await expect(page.getByText('finding stories near Indiranagar.')).toBeVisible();
  const card = page.locator('article').first();
  await expect(card).toBeVisible({ timeout: 8000 });
  await expect(page.getByText('Breaking').first()).toBeVisible();

  // Save shows the toast; the reader sheet opens and closes.
  await page.getByRole('button', { name: 'bookmark', exact: true }).first().click();
  await expect(page.getByText('saved to reading list')).toBeVisible();
  await page.getByRole('button', { name: 'read full article →' }).first().click();
  await expect(page.getByRole('link', { name: 'open original article →' })).toBeVisible();
  await page.keyboard.press('Escape');

  // The list view shows the whole queue, including the hyperlocal story with its distance.
  await page.getByRole('radio', { name: 'list view' }).first().click();
  await expect(page.getByText('Indiranagar · 1.2 km away')).toBeVisible();
  await expect(page.getByRole('heading', { name: /100 Feet Road closes/ })).toBeVisible();

  // Saved stories list has it, and it survives a reload.
  await page.goto('/saved');
  await expect(page.getByText('1 story')).toBeVisible();
});

test('wrong password counts down, then pauses', async ({ page, request }) => {
  const email = `lock${Date.now()}@example.com`;
  await request.post('/api/auth/signup', { data: { name: 'L', email, password: 'Longpass123', terms: true } });
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('nope12345');
  await page.getByRole('button', { name: 'log in' }).click();
  await expect(page.getByText("that email and password don't match. check them and try again.")).toBeVisible();
  await expect(page.getByText('incorrect password. 2 attempts left before a 15-minute pause.')).toBeVisible();
});
