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

test("la case Même taille par page répare une page désynchronisée quand on la recoche", async ({ page }) => {
  await expect
    .poll(async () => (await allFonts(page)).every((s) => s > 10), { timeout: 10000 })
    .toBe(true);

  // Décoche puis casse l'uniformité à la main (la case est cochée par défaut).
  await page.uncheck('#harmonize');
  await expect(page.locator('#harmonize')).not.toBeChecked();
  await page.evaluate(() => {
    document.querySelectorAll('.editable-area')[0].style.fontSize = '250px';
  });
  expect(new Set(await allFonts(page)).size).toBeGreaterThan(1);

  // Recoche : tout redevient uniforme d'un seul clic.
  await page.check('#harmonize');
  await expect(page.locator('#harmonize')).toBeChecked();
  const sizes = await allFonts(page);
  expect(new Set(sizes).size).toBe(1);
});

test('le champ Taille fixe la police et neutralise la case', async ({ page }) => {
  await expect
    .poll(async () => (await allFonts(page)).every((s) => s > 10), { timeout: 10000 })
    .toBe(true);

  // Taille auto : le placeholder annonce la taille calculée.
  await expect(page.locator('#size-input')).toHaveAttribute('placeholder', /^Auto \(\d+\)$/);

  // Taille fixe : appliquée partout, et la case n'a plus de sens.
  await page.fill('#size-input', '48');
  expect(await allFonts(page)).toEqual(new Array(6).fill(48));
  await expect(page.locator('#harmonize')).toBeDisabled();

  // Retour à vide : auto-ajustement, case réactivée.
  await page.fill('#size-input', '');
  await expect(page.locator('#harmonize')).toBeEnabled();
  await expect.poll(async () => new Set(await allFonts(page)).size).toBe(1);
  expect((await allFonts(page))[0]).toBeGreaterThan(48);
});
