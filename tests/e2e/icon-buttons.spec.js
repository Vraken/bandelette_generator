import { test, expect } from '@playwright/test';

// Boutons réduits à un pictogramme : leur libellé ne vit plus que dans
// title (infobulle au survol) et aria-label (lecteurs d'écran). Sans ce
// garde-fou, retirer un texte laisse un bouton anonyme.
const ICON_ONLY = {
  '#btn-full': 'Pleine Page',
  '#btn-thirds': 'Tiers (Horizontal)',
  '#btn-halves': 'Moitiés (Vertical)',
  '#btn-eight': '8 Rectangles',
  '#btn-sixteen': '16 Rectangles',
  '#btn-align-center': 'Centré',
  '#btn-align-left': 'Gauche',
  '#btn-uppercase': 'Majuscules',
  '#btn-print': 'Imprimer',
  '#btn-pdf': 'Enregistrer en PDF',
  '#btn-import': 'Importer Liste',
  '#btn-reset': 'Remise à zéro',
};

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
});

test('chaque bouton-icône garde son libellé en title et aria-label', async ({ page }) => {
  for (const [id, label] of Object.entries(ICON_ONLY)) {
    const button = page.locator(id);
    await expect(button, id).toHaveAttribute('title', label);
    await expect(button, id).toHaveAttribute('aria-label', label);
    // Un pictogramme, et rien d'autre : un libellé visible rendrait le title
    // inutile. Majuscules fait exception, ses deux lettres SONT son icône.
    const expected = id === '#btn-uppercase' ? 'AA' : '';
    expect((await button.innerText()).trim(), id).toBe(expected);
  }
});

test("les mises en page portent un dessin, Majuscules porte ses lettres", async ({ page }) => {
  for (const id of ['#btn-full', '#btn-thirds', '#btn-halves', '#btn-eight', '#btn-sixteen']) {
    await expect(page.locator(`${id} svg.btn-icon`), id).toBeVisible();
  }
  await expect(page.locator('#btn-uppercase .btn-glyph')).toHaveText('AA');
});

test('Imprimer reste reconnaissable sans libellé : seul bouton coloré', async ({ page }) => {
  await expect(page.locator('#btn-print svg.btn-icon')).toBeVisible();
  await expect(page.locator('#btn-print')).toHaveClass(/btn-primary/);
});
