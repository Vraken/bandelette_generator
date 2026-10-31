import { test, expect } from '@playwright/test';

const LINES = [
  'Réunion de préparation',
  'Avant l’arrivée des jeunes',
  '5 min avant',
  'Pendant',
  'À la fin',
  'Après',
];

async function importList(page, lines) {
  await page.click('#btn-import');
  await page.fill('#import-text', lines.join('\n'));
  await page.click('#btn-do-import');
}

async function allFonts(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('.editable-area')).map((a) => parseInt(a.style.fontSize, 10) || 0)
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.click('#btn-thirds');
  await importList(page, LINES);
  await expect(page.locator('.a4-page')).toHaveCount(2);
});

test('harmonisation globale : une seule taille sur les 2 pages après import', async ({ page }) => {
  await expect
    .poll(async () => (await allFonts(page)).every((s) => s > 10), { timeout: 10000 })
    .toBe(true);

  const sizes = await allFonts(page);
  expect(sizes).toHaveLength(6);
  // Avant le fix : page 1 à ~116px, page 2 à ~232px (harmonisation par page).
  expect(new Set(sizes).size).toBe(1);

  // Pas de débordement malgré la taille commune.
  const overflow = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.editable-area')).every(
      (a) => a.scrollHeight <= a.clientHeight + 1 && a.scrollWidth <= a.clientWidth + 1
    )
  );
  expect(overflow).toBe(true);
});

test("le bouton Harmoniser répare une page désynchronisée quand on le réactive", async ({ page }) => {
  await expect
    .poll(async () => (await allFonts(page)).every((s) => s > 10), { timeout: 10000 })
    .toBe(true);

  // Désactive puis casse l'uniformité à la main (bouton déjà actif = 1er clic désactive).
  await page.click('#btn-harmonize');
  await expect(page.locator('#btn-harmonize.active')).toHaveCount(0);
  await page.evaluate(() => {
    document.querySelectorAll('.editable-area')[0].style.fontSize = '250px';
  });
  expect(new Set(await allFonts(page)).size).toBeGreaterThan(1);

  // Réactive : tout redevient uniforme d'un seul clic.
  await page.click('#btn-harmonize');
  await expect(page.locator('#btn-harmonize.active')).toHaveCount(1);
  const sizes = await allFonts(page);
  expect(new Set(sizes).size).toBe(1);
});
