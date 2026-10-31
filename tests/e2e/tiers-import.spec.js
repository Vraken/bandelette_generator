import { test, expect } from '@playwright/test';

const LINES = [
  "Se mettre d'accord sur les règles du jeu",
  'Prévoir les étapes du jeu',
  'Prévoir le rôle de chacun',
];

async function importList(page, lines) {
  await page.click('#btn-import');
  await page.fill('#import-text', lines.join('\n'));
  await page.click('#btn-do-import');
}

async function areaMetrics(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('.editable-area')).map((a) => ({
      text: a.innerText.slice(0, 50),
      fontSize: parseInt(a.style.fontSize, 10) || 0,
      clientW: a.clientWidth,
      clientH: a.clientHeight,
      scrollW: a.scrollWidth,
      scrollH: a.scrollHeight,
    }))
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('.a4-page')).toHaveCount(1);
});

test('tiers + importer liste : la police remplit chaque case (jamais 10px)', async ({ page }) => {
  await page.click('#btn-thirds');
  await importList(page, LINES);
  // Attend que l'auto-fit asynchrone (rAF + fonts.ready) ait fini.
  await expect
    .poll(async () => (await areaMetrics(page)).every((m) => m.fontSize > 30), { timeout: 10000 })
    .toBe(true);

  const metrics = await areaMetrics(page);
  expect(metrics).toHaveLength(3);
  for (const m of metrics) {
    // Pas de débordement réel (tolérance 1px, comme fitsAt).
    expect(m.scrollH, `débordement vertical pour "${m.text}"`).toBeLessThanOrEqual(m.clientH + 1);
    expect(m.scrollW, `débordement horizontal pour "${m.text}"`).toBeLessThanOrEqual(m.clientW + 1);
  }
  // Harmonisation : les 3 bandes partagent la même taille (le min).
  const sizes = metrics.map((m) => m.fontSize);
  expect(new Set(sizes).size).toBe(1);
});

test('toutes les mises en page : chaque case est ajustée au-delà du minimum', async ({ page }) => {
  const layouts = [
    ['#btn-full', 1],
    ['#btn-thirds', 3],
    ['#btn-halves', 2],
    ['#btn-eight', 8],
    ['#btn-sixteen', 16],
  ];
  for (const [btn, count] of layouts) {
    await page.click(btn);
    await expect(page.locator('.editable-area')).toHaveCount(count);
    await expect
      .poll(
        async () => {
          const ms = await areaMetrics(page);
          return ms.length === count && ms.every((m) => m.fontSize > 10);
        },
        { timeout: 10000 }
      )
      .toBe(true);
  }
});

test('tiers à l’impression : lignes horizontales seulement, pas de verticales', async ({ page }) => {
  await page.click('#btn-thirds');
  await importList(page, LINES);
  await expect
    .poll(async () => (await areaMetrics(page)).every((m) => m.fontSize > 30), { timeout: 10000 })
    .toBe(true);

  await page.emulateMedia({ media: 'print' });
  // Souris hors des zones : aucun :hover ne doit influencer les pointillés.
  await page.mouse.move(10, 10);
  const borders = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.layout-thirds .editable-area')).map((a) => {
      const cs = getComputedStyle(a);
      const after = getComputedStyle(a, '::after');
      return {
        left: cs.borderLeftWidth,
        right: cs.borderRightWidth,
        top: cs.borderTopWidth,
        bottom: `${cs.borderBottomWidth} ${cs.borderBottomStyle} ${cs.borderBottomColor}`,
        afterBottom: `${after.borderBottomWidth} ${after.borderBottomStyle}`,
        afterOffset: after.bottom,
        afterContent: after.content,
      };
    })
  );
  expect(borders).toHaveLength(3);
  // Tiers 1-2 : vraie bordure basse visible, aucune verticale.
  for (const b of borders.slice(0, 2)) {
    expect(b.left).toBe('0px');
    expect(b.right).toBe('0px');
    expect(b.bottom).toBe('1px dashed rgb(170, 170, 170)');
  }
  // Dernier tiers : bordure au bord exact rognée -> ligne via ::after à 2px.
  // (2px et non 1px : vérifié par capture, 1px au bord de page est quasi
  // invisible à cause du rognage/arrondi sous-pixel.)
  expect(borders[2].left).toBe('0px');
  expect(borders[2].right).toBe('0px');
  expect(borders[2].afterBottom).toBe('2px dashed');
  expect(borders[2].afterOffset).toBe('2px');
  expect(borders[2].afterContent).not.toBe('none');
});
