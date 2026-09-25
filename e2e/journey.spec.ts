import { test, expect } from '@playwright/test';

test('first launch through onboarding to the swipe feed', async ({ page }) => {
  const email = `reader${Date.now()}@example.com`;
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'be dangerously well informed.' })).toBeVisible();
  await page.getByRole('button', { name: 'start reading free' }).click();
  await page.getByRole('button', { name: 'Continue with email' }).click();

  // Dummy sign up: only the email is checked, then straight into onboarding (no code).
  await expect(page.getByText('demo mode · any email and password creates your account. no code needed.')).toBeVisible();
  await page.getByLabel('Name').fill('Maya Chen');
  await page.getByLabel('Email').fill('maya@example');
  await page.getByLabel('Password', { exact: true }).click();
  await expect(page.getByText('enter a full email address, like name@example.com.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'create account' })).toBeDisabled();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('x');
  await page.getByRole('button', { name: 'create account' }).click();

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

test('dummy log in: any email and password signs straight in', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByText('demo mode · any email and password logs you in.')).toBeVisible();
  await page.getByLabel('Email').fill(`someone${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill('anything');
  await page.getByRole('button', { name: 'log in' }).click();
  // A new account has no topics yet, so it lands in onboarding.
  await expect(page.getByRole('heading', { name: 'what do you follow?' })).toBeVisible({ timeout: 5000 });
});

test('a stale sign-in left on the device never blocks sign up', async ({ page, context }) => {
  // An earlier visit left a signed-in user and a session cookie the server no longer knows.
  await page.goto('/landing');
  await page.evaluate(() => {
    localStorage.setItem('tn:wasSignedIn', 'true');
    localStorage.setItem('tn:user', JSON.stringify({ id: 'gone', name: 'Old', email: 'old@example.com', verified: true, createdAt: new Date().toISOString() }));
  });
  await context.addCookies([{ name: 'tn_session', value: 'stale-token-from-before', url: 'http://localhost:8788' }]);
  await page.goto('/signup');
  await page.waitForTimeout(1500);
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await page.getByLabel('Email').fill(`fresh${Date.now()}@example.com`);
  await page.getByRole('button', { name: 'create account' }).click();
  await expect(page.getByRole('heading', { name: 'what do you follow?' })).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
});

test('a session that lapses while the app is open shows the signed-out pop-up', async ({ page, context }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(`reader${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill('x');
  await page.getByRole('button', { name: 'log in' }).click();
  await expect(page.getByRole('heading', { name: 'what do you follow?' })).toBeVisible({ timeout: 5000 });
  // The server forgets the session (expired, revoked) while the app stays open…
  await context.clearCookies();
  await context.addCookies([{ name: 'tn_session', value: 'revoked', url: 'http://localhost:8788' }]);
  // …and the next synced change finds out.
  for (const t of ['AI Models', 'AI Policy', 'Robotics']) await page.getByRole('button', { name: t, exact: true }).click();
  await page.getByRole('button', { name: 'continue →' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible({ timeout: 5000 });
  await expect(dialog.getByText("you've been signed out.")).toBeVisible();
  // Onboarding needs an account, so it waits on the welcome screen; "log in" goes straight there.
  await dialog.getByRole('button', { name: 'log in' }).click();
  await expect(page.getByRole('heading', { name: 'welcome back.' })).toBeVisible();
  await expect(dialog).toHaveCount(0);
});
