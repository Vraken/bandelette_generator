'use strict';
// Tests unitaires de la logique pure (fit-utils.js).
// Lance avec : npm test  (node --test tests/)

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const FU = require('../fit-utils.js');

// Fabrique un faux .editable-area dont le contenu tient jusqu'à maxFitting px.
// Reproduit le plancher navigateur : scrollH/scrollW valent AU MINIMUM
// clientH/clientW (constaté en vrai Chromium : à 10px, scroll == client).
function mockArea({ w = 700, h = 370, maxFitting = 100, fontSize = '' } = {}) {
    const el = {
        style: { fontSize, alignItems: '', justifyContent: '' },
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

describe('parseFittedSize', () => {
    it('parse "120px" -> 120', () => assert.equal(FU.parseFittedSize('120px'), 120));
    it('zone non ajustée "" -> null (jamais 10)', () => assert.equal(FU.parseFittedSize(''), null));
    it('undefined -> null', () => assert.equal(FU.parseFittedSize(undefined), null));
    it('"0px" -> null', () => assert.equal(FU.parseFittedSize('0px'), null));
    it('"abc" -> null', () => assert.equal(FU.parseFittedSize('abc'), null));
});

describe('minValidSize', () => {
    it('ignore les null', () => assert.equal(FU.minValidSize([120, null, 100]), 100));
    it('aucune taille valide -> null (ne touche à rien)', () => assert.equal(FU.minValidSize([null, null]), null));
    it('liste vide -> null', () => assert.equal(FU.minValidSize([]), null));
});

describe('binarySearchOptimal', () => {
    it('trouve le max qui tient', () => {
        assert.equal(FU.binarySearchOptimal(10, 500, (s) => s <= 75), 75);
    });
    it('tout tient -> max', () => {
        assert.equal(FU.binarySearchOptimal(10, 500, () => true), 500);
    });
    it('rien ne tient -> min', () => {
        assert.equal(FU.binarySearchOptimal(10, 500, () => false), 10);
    });
});

describe('autoFitElement', () => {
    it('remplit la case (100px pour un contenu qui tient jusqu’à 100)', () => {
        const el = mockArea({ maxFitting: 100 });
        assert.equal(FU.autoFitElement(el), 100);
        assert.equal(el.style.fontSize, '100px');
    });
    it('REGRESSION plancher navigateur : scroll == client à petite police doit tenir (pas rester à 10px)', () => {
        // En vrai Chromium, à 10px : scrollH == clientH et scrollW == clientW.
        // L'ancien `scroll <= client - 4` était donc toujours faux.
        const el = mockArea({ maxFitting: 200 });
        el.style.fontSize = '10px';
        assert.equal(el.scrollHeight, el.clientHeight);
        assert.equal(el.scrollWidth, el.clientWidth);
        assert.equal(FU.autoFitElement(el), 200);
    });
    it('conteneur non mesurable (0x0) -> null et ne fige pas à 10px', () => {
        const el = mockArea({ w: 0, h: 0 });
        assert.equal(FU.autoFitElement(el), null);
        assert.equal(el.style.fontSize, '');
    });
    it('restaure le centrage après mesure', () => {
        const el = mockArea({ maxFitting: 80 });
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        FU.autoFitElement(el);
        assert.equal(el.style.alignItems, 'center');
        assert.equal(el.style.justifyContent, 'center');
    });
});

describe('harmonizeAreas', () => {
    it('aligne tout sur le min des zones ajustées', () => {
        const areas = [{ style: { fontSize: '120px' } }, { style: { fontSize: '150px' } }, { style: { fontSize: '100px' } }];
        assert.equal(FU.harmonizeAreas(areas), 100);
        assert.deepEqual(areas.map((a) => a.style.fontSize), ['100px', '100px', '100px']);
    });

    it('REGRESSION importer-liste : ignore les zones pas encore ajustées (sinon 10px)', () => {
        // Ancien code : Math.min(...["120px","",""].map(s => parseInt(s) || 10)) -> 10. BUG.
        const areas = [{ style: { fontSize: '120px' } }, { style: { fontSize: '' } }, { style: { fontSize: '' } }];
        assert.equal(FU.harmonizeAreas(areas), 120);
        assert.deepEqual(areas.map((a) => a.style.fontSize), ['120px', '120px', '120px']);
    });

    it('aucune zone ajustée -> null et ne modifie rien', () => {
        const areas = [{ style: { fontSize: '' } }, { style: { fontSize: '' } }];
        assert.equal(FU.harmonizeAreas(areas), null);
        assert.deepEqual(areas.map((a) => a.style.fontSize), ['', '']);
    });

    it('les cases vides (max 500) ne réduisent pas les autres', () => {
        const areas = [{ style: { fontSize: '120px' } }, { style: { fontSize: '500px' } }, { style: { fontSize: '500px' } }];
        assert.equal(FU.harmonizeAreas(areas), 120);
    });
});
