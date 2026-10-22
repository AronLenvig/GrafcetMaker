import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// Use the portable code paths (download / <input type=file>) so the test needs no native dialogs.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    delete w.showOpenFilePicker;
    delete w.showSaveFilePicker;
  });
});

/** The start screen greets every launch; Continue goes to the open project. */
async function closeStartScreen(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Welcome' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(dialog).toBeHidden();
}

async function appendStep(page: Page, receptivity: string) {
  await page.keyboard.press('Enter');
  await expect(page.getByRole('combobox', { name: 'Receptivity' })).toBeFocused();
  await page.keyboard.type(receptivity);
  await page.keyboard.press('Enter');
}

test('create a sequence, save it, reopen it', async ({ page }, testInfo) => {
  await page.goto('./');
  await closeStartScreen(page);
  await expect(page.locator('[data-el="step"]')).toHaveCount(1);

  await appendStep(page, 'start * /stop');
  await appendStep(page, 'b');
  await page.keyboard.press('a');
  await page.keyboard.type('M1');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-el="step"]')).toHaveCount(3);
  await expect(page.locator('[data-el="transition"]')).toHaveCount(2);
  await expect(page.locator('[data-el="action"]')).toContainText('M1');

  // Save (download fallback).
  const downloadPromise = page.waitForEvent('download');
  await page.keyboard.press('Control+s');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('Untitled.grafcet.json');
  const path = testInfo.outputPath('saved.grafcet.json');
  await download.saveAs(path);
  const saved = JSON.parse(readFileSync(path, 'utf8'));
  expect(saved.schemaVersion).toBe(2);
  await expect(page.getByLabel('Unsaved changes')).toHaveCount(0);

  // Undo/redo: the text edit, then the added action.
  await page.keyboard.press('Control+z');
  await expect(page.locator('[data-el="action"]')).not.toContainText('M1');
  await page.keyboard.press('Control+z');
  await expect(page.locator('[data-el="action"]')).toHaveCount(0);
  await page.keyboard.press('Control+Shift+z');
  await page.keyboard.press('Control+y');
  await expect(page.locator('[data-el="action"]')).toContainText('M1');

  // New project, then reopen the saved file.
  await page.getByRole('button', { name: 'File' }).click();
  await page.getByRole('menuitem', { name: 'New project' }).click();
  await expect(page.locator('[data-el="step"]')).toHaveCount(1);
  const chooserPromise = page.waitForEvent('filechooser');
  await page.keyboard.press('Control+o');
  await (await chooserPromise).setFiles(path);
  await expect(page.locator('[data-el="step"]')).toHaveCount(3);
  await expect(page.locator('[data-el="transition"]').first()).toContainText('start·stop'); // textbook notation: NOT drawn as an overbar

  // Simulate: declare the inputs, start the simulation and drive an input.
  await page.getByRole('tab', { name: 'Variables', exact: true }).click();
  for (const name of ['start', 'stop']) {
    await page.getByRole('button', { name: 'Add variable' }).click();
    await page.keyboard.type(name);
    await page.keyboard.press('Enter');
  }
  const step = (n: number) =>
    page.locator('[data-el="step"]').filter({ hasText: new RegExp(`^${n}$`) });
  await page.keyboard.press('F5');
  await expect(page.getByText('SIMULATION', { exact: true })).toBeVisible();
  await expect(step(0)).toHaveAttribute('aria-current', 'step');
  await page.getByRole('switch', { name: 'Input start' }).click();
  await expect(step(1)).toHaveAttribute('aria-current', 'step');
  await expect(step(0)).not.toHaveAttribute('aria-current', 'step');
  await page.keyboard.press('Shift+F5');
  await expect(page.getByText('SIMULATION', { exact: true })).toHaveCount(0);
});

test('unsaved work is offered back after a reload', async ({ page }) => {
  await page.goto('./');
  await closeStartScreen(page);
  await appendStep(page, 'go');
  await expect(page.getByLabel('Unsaved changes')).toBeVisible();
  await page.waitForTimeout(800); // autosave debounce
  page.on('dialog', (d) => void d.accept());
  await page.reload();
  await page.getByRole('button', { name: 'Restore' }).click();
  await closeStartScreen(page);
  await expect(page.locator('[data-el="step"]')).toHaveCount(2);
  await expect(page.locator('[data-el="transition"]')).toContainText('go');
});

test('theme can be switched', async ({ page }) => {
  await page.goto('./');
  await closeStartScreen(page);
  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('radio', { name: 'Light' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
