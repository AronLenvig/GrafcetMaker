import { expect, test, type Page } from '@playwright/test';

// Live collaboration through the relay (server/relay.ts, started by playwright.config.ts): two
// people in separate browser contexts edit the same project, see each other, and one simulates.

async function closeStartScreen(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Welcome' });
  await dialog.getByRole('button', { name: 'Start drawing', exact: true }).click();
  await expect(dialog).toBeHidden();
}

const step = (page: Page, n: number) =>
  page.locator('[data-el="step"]').filter({ hasText: new RegExp(`^${n}$`) });

/** Selects step `n` and appends a transition with `receptivity` and a step below it. */
async function appendAfter(page: Page, n: number, receptivity: string) {
  await step(page, n).click();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('combobox', { name: 'Receptivity' })).toBeFocused();
  await page.keyboard.type(receptivity);
  await page.keyboard.press('Enter');
}

test('two people edit and simulate together in a live session', async ({ browser }) => {
  const ada = await (await browser.newContext()).newPage();
  const bo = await (await browser.newContext()).newPage();

  // Ada starts a session with her project.
  await ada.goto('./');
  await closeStartScreen(ada);
  await ada.getByRole('button', { name: 'Live collaboration…' }).click();
  const dialog = ada.getByRole('dialog', { name: 'Live collaboration' });
  await dialog.getByLabel('Your name').fill('Ada');
  await dialog.getByRole('button', { name: 'Start live session' }).click();
  await expect(dialog.getByRole('status')).toHaveText('Connected');
  const link = await dialog.getByLabel('Link to send').inputValue();
  expect(link).toMatch(/#room=[0-9a-z]{20},[\w-]{22}$/);
  await ada.keyboard.press('Escape');

  // Bo opens the link: asked first, then the project opens.
  await bo.goto(link);
  const join = bo.getByRole('dialog', { name: 'Join a live session' });
  await join.getByLabel('Your name').fill('Bo');
  await join.getByRole('button', { name: 'Join', exact: true }).click();
  await expect(bo.locator('[data-el="step"]')).toHaveCount(1);
  await expect(ada.getByRole('button', { name: /^Show where Bo is/ })).toBeVisible();
  await expect(bo.getByRole('button', { name: /^Show where Ada is/ })).toBeVisible();

  // Both edit; each sees the other's changes.
  await appendAfter(ada, 0, 'go');
  await expect(bo.locator('[data-el="step"]')).toHaveCount(2);
  await expect(bo.locator('[data-el="transition"]')).toContainText('go');
  await appendAfter(bo, 1, 'done');
  await expect(ada.locator('[data-el="step"]')).toHaveCount(3);
  await expect(ada.locator('[data-el="transition"]').filter({ hasText: 'done' })).toHaveCount(1);

  // Bo simulates: Ada's next change waits until Bo restarts with it.
  await bo.keyboard.press('F5');
  await expect(bo.getByText('SIMULATION', { exact: true })).toBeVisible();
  await expect(ada.getByRole('button', { name: /^Show where Bo is.*simulating/ })).toBeVisible();
  await appendAfter(ada, 2, 'more');
  const restart = bo.getByRole('button', { name: /Ada changed the diagram/ });
  await expect(restart).toBeVisible();
  await expect(bo.locator('[data-el="step"]')).toHaveCount(3);
  await restart.click();
  await expect(bo.locator('[data-el="step"]')).toHaveCount(4);
  await expect(bo.getByText('SIMULATION', { exact: true })).toBeVisible();
  await expect(step(bo, 0)).toHaveAttribute('aria-current', 'step');
  await bo.keyboard.press('Shift+F5');

  // Bo leaves; the project stays with him, and Ada sees him go.
  await bo.getByRole('button', { name: /other person in this live session/ }).click();
  await bo.getByRole('button', { name: 'Leave session' }).click();
  await expect(ada.getByRole('button', { name: /^Show where Bo is/ })).toHaveCount(0);
  await expect(bo.locator('[data-el="step"]')).toHaveCount(4);
  expect(new URL(bo.url()).hash).toBe('');
});
