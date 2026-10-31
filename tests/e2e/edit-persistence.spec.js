import { test, expect } from '@playwright/test';

async function importList(page, lines) {
  await page.click('#btn-import');
  await page.fill('#import-text', lines.join('\n'));
  await page.click('#btn-do-import');
}

async function areaTexts(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('.editable-area')).map((a) => a.innerText));
}

async function typeInto(page, index, text) {
  const area = page.locator('.editable-area').nth(index);
  await area.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(text);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('.a4-page')).toHaveCount(1);
});

// Régression : setLayout re-rendait depuis currentData, qui n'était jamais
// mis à jour pendant la saisie -> tout texte tapé à la main était perdu au
// changement de mise en page (et la liste importée réapparaissait).
test('le texte tapé survit aux changements de mise en page', async ({ page }) => {
  await page.click('#btn-thirds');
  await typeInto(page, 0, 'Première');
  await typeInto(page, 1, 'Deuxième');

  for (const layout of ['#btn-sixteen', '#btn-halves', '#btn-eight', '#btn-thirds']) {
    await page.click(layout);
    const texts = await areaTexts(page);
    expect(texts.slice(0, 2)).toEqual(['Première', 'Deuxième']);
  }
});

test('une édition par-dessus une liste importée survit au changement de mise en page', async ({ page }) => {
  await page.click('#btn-thirds');
  await importList(page, ['Alpha', 'Beta', 'Gamma']);
  await typeInto(page, 1, 'Corrigé');

  await page.click('#btn-halves');
  expect(await areaTexts(page)).toEqual(['Alpha', 'Corrigé', 'Gamma', '']);
});

// Les cases de remplissage de la dernière page ne doivent pas s'accumuler
// dans currentData, sinon le retour en tiers fabrique des pages blanches.
test('un aller-retour en 16 rectangles ne crée pas de pages vides', async ({ page }) => {
  await page.click('#btn-thirds');
  await importList(page, ['Alpha', 'Beta', 'Gamma']);

  await page.click('#btn-sixteen');
  await expect(page.locator('.a4-page')).toHaveCount(1);

  await page.click('#btn-thirds');
  await expect(page.locator('.a4-page')).toHaveCount(1);
  expect(await areaTexts(page)).toEqual(['Alpha', 'Beta', 'Gamma']);
});

// currentData garde la casse d'origine : une zone non modifiée est reconnue
// via displayText(), sinon la relecture du DOM figerait les majuscules.
test('le texte tapé survit au bouton Majuscules, qui reste réversible', async ({ page }) => {
  await page.click('#btn-thirds');
  await typeInto(page, 0, 'Texte tapé');

  await page.click('#btn-uppercase');
  expect((await areaTexts(page))[0]).toBe('TEXTE TAPÉ');

  await page.click('#btn-uppercase');
  expect((await areaTexts(page))[0]).toBe('Texte tapé');
});
