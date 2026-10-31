'use strict';
// Test de non-régression du scénario exact du bug :
// "Importer Liste" en mise en page Tiers -> la police doit remplir sa case,
// jamais rester à 10px.
// Lance avec : npm test  (node --test tests/)

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const FU = require('../fit-utils.js');

function mockArea({ w = 700, h = 370, maxFitting = 100 } = {}) {
    const el = {
        style: { fontSize: '', alignItems: '', justifyContent: '' },
        clientWidth: w,
        clientHeight: h,
        isConnected: true,
    };
    Object.defineProperties(el, {
        scrollHeight: {
            get() {
                const s = parseInt(el.style.fontSize, 10) || 0;
                return s <= maxFitting ? h : h + 500;
            },
        },
        scrollWidth: {
            get() {
                const s = parseInt(el.style.fontSize, 10) || 0;
                return s <= maxFitting ? w : w + 500;
            },
        },
    });
    return el;
}

// Reproduit createPage/fitAll corrigé : ajuster TOUTES les zones d'abord
// (skip harmonize), puis harmoniser une seule fois par page.
function fitPageBatch(areas) {
    const fitted = areas.map((a) => FU.autoFitElement(a));
    const min = FU.harmonizeAreas(areas);
    return { fitted, min };
}

describe('régression : Importer Liste en Tiers (3 bandes)', () => {
    it('les 3 bandes remplissent leur case et sont harmonisées au min, pas à 10px', () => {
        const areas = [mockArea({ maxFitting: 120 }), mockArea({ maxFitting: 150 }), mockArea({ maxFitting: 100 })];
        const { fitted, min } = fitPageBatch(areas);
        assert.deepEqual(fitted, [120, 150, 100]);
        assert.equal(min, 100);
        for (const a of areas) {
            assert.ok(parseInt(a.style.fontSize, 10) > 10, `police minuscule détectée : ${a.style.fontSize}`);
            assert.equal(a.style.fontSize, '100px');
        }
    });

    it('l’ancien ordre (harmoniser après chaque zone) écrasait à 10px — le batch l’évite', () => {
        // Simulation de l'ancien bug : harmonize après la 1ère zone seulement.
        const buggyMin = Math.min(...['120px', '', ''].map((s) => parseInt(s, 10) || 10));
        assert.equal(buggyMin, 10); // documente le bug historique
        // Le code corrigé ne fait plus ça :
        const areas = [mockArea({ maxFitting: 120 }), mockArea({ maxFitting: 150 }), mockArea({ maxFitting: 100 })];
        fitPageBatch(areas);
        assert.notEqual(areas[0].style.fontSize, '10px');
    });

    it('page pas encore mise en page (0x0) : on ne fige pas à 10px', () => {
        const areas = [mockArea({ w: 0, h: 0 }), mockArea({ w: 0, h: 0 }), mockArea({ w: 0, h: 0 })];
        const { min } = fitPageBatch(areas);
        assert.equal(min, null);
        for (const a of areas) assert.equal(a.style.fontSize, '');
    });

    it('texte court + textes longs : le court ne reste pas minuscule tout seul', () => {
        const areas = [mockArea({ maxFitting: 300 }), mockArea({ maxFitting: 90 })];
        const { min } = fitPageBatch(areas);
        assert.equal(min, 90);
        assert.deepEqual(areas.map((a) => a.style.fontSize), ['90px', '90px']);
    });
});

describe('garde-fous CSS/HTML (lignes de découpe Tiers)', () => {
    const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

    it('pas de règle print générique qui force les 4 bordures visibles', () => {
        const printBlock = css.slice(css.indexOf('@media print'));
        assert.ok(!/\.editable-area\s*\{\s*border-color:\s*#aaa/.test(printBlock), 'règle générique border-color #aaa détectée en print : elle recrée des verticales parasites');
    });

    it('le Tiers print neutralise les verticales et garde l’horizontale', () => {
        assert.ok(/\.layout-thirds\s+\.editable-area\s*\{[^}]*border-left:\s*none/.test(css), 'border-left:none manquant pour .layout-thirds en print');
        assert.ok(/\.layout-thirds\s+\.editable-area:not\(:last-child\)\s*\{[^}]*border-bottom/.test(css), 'lignes de découpe manquantes pour les 2 premiers tiers');
        assert.ok(/\.layout-thirds\s+\.editable-area:last-child::after\s*\{[^}]*border-bottom:\s*2px dashed/.test(css), 'ligne sous le dernier tiers : ::after 2px dashed à 2px du bord (1px au bord exact est rogné/invisible, vérifié par capture)');
    });

    it('fit-utils.js est chargé avant script.js', () => {
        const iFit = html.indexOf('fit-utils.js');
        const iScript = html.indexOf('script.js');
        assert.ok(iFit !== -1, 'fit-utils.js non chargé dans index.html');
        assert.ok(iFit < iScript, 'fit-utils.js doit être chargé AVANT script.js');
    });
});
