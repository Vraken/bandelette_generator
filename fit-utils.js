'use strict';

// Logique pure d'auto-ajustement / harmonisation, sans dépendance au DOM.
// Utilisée par script.js dans le navigateur et par les tests Node.
// Non-régression : le bug "police minuscule après Importer Liste" venait de
// harmonizeFontSize qui comptait les zones pas encore ajustées comme 10px
// (parseInt('') || 10) et écrasait tout à 10px.

const MIN_FONT = 10;
const MAX_FONT = 500;
// Tolérance de dépassement (sous-pixels / arrondis) : scrollHeight/scrollWidth
// valent AU MINIMUM clientHeight/clientWidth (plancher navigateur), donc
// "ça tient" = scroll <= client + tolérance. Ne JAMAIS utiliser
// `scroll <= client - marge` : c'est faux même pour un texte minuscule
// (ex: 372 <= 372 - 4 → false) et ça bloquait tout à 10px.
const OVERFLOW_TOLERANCE = 1;
// Gardé pour compatibilité (anciens tests) : ne plus l'utiliser dans fitsAt.
const SAFETY_MARGIN = 4;

/**
 * Parse une valeur de style fontSize ("120px", 120, "", undefined...).
 * Retourne l'entier > 0, ou null si la zone n'a pas encore été ajustée.
 * (Ne JAMAIS retomber sur 10 ici : c'est ce qui causait l'écrasement.)
 */
function parseFittedSize(value) {
    const n = parseInt(value, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Min des tailles valides, en ignorant les zones non ajustées (null).
 * Retourne null s'il n'y a aucune taille valide (ex: page en cours de rendu).
 */
function minValidSize(sizes) {
    const valid = sizes.filter((s) => s !== null && Number.isFinite(s));
    if (valid.length === 0) return null;
    return Math.min(...valid);
}

/**
 * Recherche dichotomique du max qui tient.
 * fitsAt(size) -> true si le contenu tient à cette taille.
 */
function binarySearchOptimal(minSize, maxSize, fitsAt) {
    let optimal = minSize;
    let lo = minSize;
    let hi = maxSize;
    while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (fitsAt(mid)) {
            optimal = mid;
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }
    return optimal;
}

/**
 * Ajuste un élément DOM à son conteneur (binaire scroll/client).
 * Retourne la taille optimale, ou null si le conteneur n'est pas mesurable
 * (clientWidth/Height à 0 : mise en page pas encore faite) — dans ce cas
 * l'élément est laissé inchangé pour qu'un passage ultérieur réessaie,
 * au lieu de le figer à 10px.
 */
function autoFitElement(el, options = {}) {
    const minSize = options.minSize ?? MIN_FONT;
    const maxSize = options.maxSize ?? MAX_FONT;
    const tolerance = options.tolerance ?? OVERFLOW_TOLERANCE;

    const cw = el.clientWidth;
    const ch = el.clientHeight;
    if (!cw || !ch) return null;

    const prevAlign = el.style.alignItems;
    const prevJustify = el.style.justifyContent;
    el.style.alignItems = 'flex-start';
    el.style.justifyContent = 'flex-start';

    try {
        el.style.fontSize = minSize + 'px';
        const fitsAt = (size) => {
            el.style.fontSize = size + 'px';
            return (
                el.scrollHeight <= el.clientHeight + tolerance &&
                el.scrollWidth <= el.clientWidth + tolerance
            );
        };
        const optimal = binarySearchOptimal(minSize, maxSize, fitsAt);
        el.style.fontSize = optimal + 'px';
        return optimal;
    } finally {
        el.style.alignItems = prevAlign;
        el.style.justifyContent = prevJustify;
    }
}

/**
 * Harmonise une liste de zones : lit leurs fontSize, prend le min des
 * zones ajustées, l'applique à toutes. Ignore les zones non ajustées.
 * Retourne le min appliqué, ou null si rien à faire.
 */
function harmonizeAreas(areas) {
    const sizes = areas.map((a) => parseFittedSize(a.style && a.style.fontSize));
    const min = minValidSize(sizes);
    if (min === null) return null;
    areas.forEach((a) => {
        a.style.fontSize = min + 'px';
    });
    return min;
}

const api = {
    MIN_FONT,
    MAX_FONT,
    SAFETY_MARGIN,
    OVERFLOW_TOLERANCE,
    parseFittedSize,
    minValidSize,
    binarySearchOptimal,
    autoFitElement,
    harmonizeAreas,
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
}
if (typeof window !== 'undefined') {
    window.__fitUtils = api;
}
