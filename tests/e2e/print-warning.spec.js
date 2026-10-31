import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
});

test("l'avertissement marges n'apparaît qu'au survol du bouton Imprimer", async ({ page }) => {
  const hint = page.locator('#print-warning');
  // Masqué par défaut.
  await expect(hint).toBeHidden();

  // Visible au survol du bouton Imprimer.
  await page.hover('#btn-print');
  await expect(hint).toBeVisible();
  await expect(hint).toContainText('Aucune');

  // Jamais sur papier, même en survol.
  await page.emulateMedia({ media: 'print' });
  await expect(hint).toBeHidden();
});

test('le bouton Imprimer porte une icône', async ({ page }) => {
  const icon = page.locator('#btn-print svg.btn-icon');
  await expect(icon).toBeVisible();
  await expect(page.locator('#btn-print')).toContainText('Imprimer');
});
