import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('.a4-page')).toHaveCount(1);
});

test('la fenêtre propose un vrai champ multiligne avec compteur en direct', async ({ page }) => {
  await page.click('#btn-thirds');
  await page.click('#btn-import');
  const modal = page.locator('#import-modal');
  await expect(modal).toBeVisible();
  await expect(page.locator('#import-text')).toBeFocused();

  // Liste vide au départ (texte d'aide affiché) : compteur + bouton désactivé.
  await expect(page.locator('#import-count')).toHaveText('Liste vide');
  await expect(page.locator('#btn-do-import')).toBeDisabled();

  // 6 lignes en tiers -> compteur "6 lignes → 2 pages", bouton actif.
  // Les lignes vides ne comptent pas.
  await page.fill('#import-text', 'Alpha\n\nBeta\n  \nGamma\nDelta\nEpsilon\nZeta');
  await expect(page.locator('#import-count')).toHaveText('6 lignes → 2 pages');
  await expect(page.locator('#btn-do-import')).toBeEnabled();
});

test('Annuler / Échap / clic dehors : rien n’est importé', async ({ page }) => {
  const before = await page.locator('.editable-area').allInnerTexts();

  await page.click('#btn-import');
  await page.fill('#import-text', 'Alpha\nBeta');
  await page.click('#btn-cancel-import');
  await expect(page.locator('#import-modal')).toBeHidden();
  expect(await page.locator('.editable-area').allInnerTexts()).toEqual(before);

  await page.click('#btn-import');
  await page.fill('#import-text', 'Alpha\nBeta');
  await page.keyboard.press('Escape');
  await expect(page.locator('#import-modal')).toBeHidden();
  expect(await page.locator('.editable-area').allInnerTexts()).toEqual(before);

  await page.click('#btn-import');
  await page.fill('#import-text', 'Alpha\nBeta');
  await page.mouse.click(10, 300);
  await expect(page.locator('#import-modal')).toBeHidden();
  expect(await page.locator('.editable-area').allInnerTexts()).toEqual(before);
});

test('Importer remplit les rectangles (lignes vides ignorées)', async ({ page }) => {
  await page.click('#btn-thirds');
  await page.click('#btn-import');
  await page.fill('#import-text', '  Alpha  \n\nBeta\n');
  await page.click('#btn-do-import');
  await expect(page.locator('#import-modal')).toBeHidden();

  const texts = await page.locator('.editable-area').allInnerTexts();
  expect(texts).toEqual(['Alpha', 'Beta', '']);
});

test('Ctrl+Entrée importe directement', async ({ page }) => {
  await page.click('#btn-import');
  await page.fill('#import-text', 'Alpha\nBeta');
  await page.press('#import-text', 'Control+Enter');
  await expect(page.locator('#import-modal')).toBeHidden();
  // Mise en page par défaut (pleine page) : une ligne par page.
  expect(await page.locator('.editable-area').allInnerTexts()).toEqual(['Alpha', 'Beta']);
});

test('rouvrir la fenêtre propose la liste actuelle pour retouche', async ({ page }) => {
  await page.click('#btn-import');
  await page.fill('#import-text', 'Alpha\nBeta');
  await page.click('#btn-do-import');

  await page.click('#btn-import');
  await expect(page.locator('#import-text')).toHaveValue('Alpha\nBeta');
});
