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

async function appendStep(page: Page, receptivity: string) {
  await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox', { name: 'Receptivity' })).toBeFocused();
  await page.keyboard.type(receptivity);
  await page.keyboard.press('Enter');
}

test('create a sequence, save it, reopen it', async ({ page }, testInfo) => {
  await page.goto('./');
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
  expect(saved.schemaVersion).toBe(1);
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
  await expect(page.locator('[data-el="transition"]').first()).toContainText('start * /stop');
});

test('unsaved work is offered back after a reload', async ({ page }) => {
  await page.goto('./');
  await appendStep(page, 'go');
  await expect(page.getByLabel('Unsaved changes')).toBeVisible();
  await page.waitForTimeout(800); // autosave debounce
  page.on('dialog', (d) => void d.accept());
  await page.reload();
  await page.getByRole('button', { name: 'Restore' }).click();
  await expect(page.locator('[data-el="step"]')).toHaveCount(2);
  await expect(page.locator('[data-el="transition"]')).toContainText('go');
});

test('theme can be switched', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('radio', { name: 'Light' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
