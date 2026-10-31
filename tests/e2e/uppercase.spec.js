import { test, expect } from '@playwright/test';

async function importList(page, lines) {
  await page.click('#btn-import');
  await page.fill('#import-text', lines.join('\n'));
  await page.click('#btn-do-import');
}

async function areaTexts(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('.editable-area')).map((a) => a.innerText));
}

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('.a4-page')).toHaveCount(1);
});

test('bouton Majuscules : bascule tout en majuscules puis restaure', async ({ page }) => {
  const lines = ['Se mettre en rang', 'Prévoir le rôle de chacun'];
  await page.click('#btn-thirds');
  await importList(page, lines);
  await expect(page.locator('.editable-area')).toHaveCount(3);

  // État initial : casse d'origine.
  expect(await areaTexts(page)).toEqual([...lines, '']);

  // Active : tout en majuscules (accents FR gérés), case vide inchangée.
  await page.click('#btn-uppercase');
  await expect(page.locator('#btn-uppercase.active')).toHaveCount(1);
  await expect
    .poll(async () => areaTexts(page), { timeout: 10000 })
    .toEqual(['SE METTRE EN RANG', 'PRÉVOIR LE RÔLE DE CHACUN', '']);

  // La police reste ajustée après la bascule (le texte élargi tient toujours).
  const metrics = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.editable-area')).map((a) => ({
      fontSize: parseInt(a.style.fontSize, 10) || 0,
      ok: a.scrollHeight <= a.clientHeight + 1 && a.scrollWidth <= a.clientWidth + 1,
    }))
  );
  expect(metrics.every((m) => m.fontSize > 10 && m.ok)).toBe(true);

  // Désactive : retour exact à la casse d'origine.
  await page.click('#btn-uppercase');
  await expect(page.locator('#btn-uppercase.active')).toHaveCount(0);
  await expect.poll(async () => areaTexts(page), { timeout: 10000 }).toEqual([...lines, '']);
});
