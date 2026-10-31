import { test, expect } from '@playwright/test';

async function importList(page, lines) {
  await page.click('#btn-import');
  await page.fill('#import-text', lines.join('\n'));
  await page.click('#btn-do-import');
}

async function alignments(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('.editable-area')).map((a) => {
      const cs = getComputedStyle(a);
      return { textAlign: cs.textAlign, justify: cs.justifyContent };
    })
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.click('#btn-thirds');
  await importList(page, ['Alpha Beta Gamma Delta', 'Epsilon Zeta']);
});

test('centré par défaut, bascule à gauche et retour', async ({ page }) => {
  // Centré par défaut.
  await expect(page.locator('#btn-align-center.active')).toHaveCount(1);
  for (const a of await alignments(page)) {
    expect(a.textAlign).toBe('center');
    expect(a.justify).toBe('center');
  }

  // Bascule à gauche : texte aligné à gauche dans toutes les zones.
  await page.click('#btn-align-left');
  await expect(page.locator('#btn-align-left.active')).toHaveCount(1);
  await expect(page.locator('#btn-align-center.active')).toHaveCount(0);
  for (const a of await alignments(page)) {
    expect(a.textAlign).toBe('left');
    expect(a.justify).toBe('flex-start');
  }

  // Le contenu et l'ajustement sont conservés (pas de débordement).
  expect(await page.locator('.editable-area').allInnerTexts()).toEqual([
    'Alpha Beta Gamma Delta',
    'Epsilon Zeta',
    '',
  ]);
  const ok = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.editable-area')).every(
      (a) => a.scrollHeight <= a.clientHeight + 1 && a.scrollWidth <= a.clientWidth + 1
    )
  );
  expect(ok).toBe(true);

  // Retour au centré.
  await page.click('#btn-align-center');
  for (const a of await alignments(page)) {
    expect(a.textAlign).toBe('center');
  }
});

test('les boutons portent des icônes avec infobulle', async ({ page }) => {
  for (const [id, label] of [['#btn-align-center', 'Centré'], ['#btn-align-left', 'Gauche']]) {
    await expect(page.locator(`${id} svg.btn-icon`)).toBeVisible();
    await expect(page.locator(id)).toHaveAttribute('title', label);
    await expect(page.locator(id)).toHaveAttribute('aria-label', label);
  }
});

test("l'alignement à gauche s'applique aussi à l'impression", async ({ page }) => {
  await page.click('#btn-align-left');
  await page.emulateMedia({ media: 'print' });
  for (const a of await alignments(page)) {
    expect(a.textAlign).toBe('left');
    expect(a.justify).toBe('flex-start');
  }
  // Et le centré reste centré en print.
  await page.emulateMedia({ media: 'screen' });
  await page.click('#btn-align-center');
  await page.emulateMedia({ media: 'print' });
  for (const a of await alignments(page)) {
    expect(a.textAlign).toBe('center');
  }
});

test("l'alignement survit au changement de mise en page", async ({ page }) => {
  await page.click('#btn-align-left');
  await page.click('#btn-eight');
  for (const a of await alignments(page)) {
    expect(a.textAlign).toBe('left');
  }
});
