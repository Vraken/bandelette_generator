document.addEventListener('DOMContentLoaded', () => {
    const pageContainer = document.getElementById('page-container');
    const fontSelector = document.getElementById('font-selector');
    const btnFull = document.getElementById('btn-full');
    const btnThirds = document.getElementById('btn-thirds');
    const btnHalves = document.getElementById('btn-halves');
    const btnEight = document.getElementById('btn-eight');
    const btnSixteen = document.getElementById('btn-sixteen');
    const sizeSelector = document.getElementById('size-selector');
    const btnHarmonize = document.getElementById('btn-harmonize');
    const btnUppercase = document.getElementById('btn-uppercase');
    const btnAlignCenter = document.getElementById('btn-align-center');
    const btnAlignLeft = document.getElementById('btn-align-left');
    const btnPrint = document.getElementById('btn-print');
    const btnPdf = document.getElementById('btn-pdf');
    const btnImport = document.getElementById('btn-import');
    const btnReset = document.getElementById('btn-reset');

    // Default placeholder text
    const placeholderText = 'Cliquez ici pour éditer le texte...';

    // Global state for layout
    let currentLayout = 'layout-full';
    let currentCount = 1;
    let currentIsLandscape = true;
    let currentData = [placeholderText];

    // Utilitaires purs (fit-utils.js, chargé avant ce script).
    // Fallback local si le fichier est absent.
    const FU = (typeof window !== 'undefined' && window.__fitUtils) || null;

    // Function to fit text to container
    // skipHarmonize=true : ne pas harmoniser (utilisé pour les traitements par lot,
    // où l'harmonisation se fait une seule fois après avoir ajusté toutes les zones)
    // Retourne la taille optimale, ou null si non mesurable (layout pas prêt).
    function autoFitText(element, skipHarmonize = false, _retry = 0) {
        const size = sizeSelector ? sizeSelector.value : 'auto';
        if (size !== 'auto') {
            element.style.fontSize = size + 'px';
            return parseInt(size, 10);
        }

        let optimal = null;
        if (FU) {
            optimal = FU.autoFitElement(element);
            if (optimal === null) {
                // Mise en page pas prête (clientWidth/Height à 0) : ne pas figer
                // à 10px, réessayer quand le layout sera fait (borné).
                if (_retry < 5) {
                    requestAnimationFrame(() => {
                        if (element.isConnected) autoFitText(element, skipHarmonize, _retry + 1);
                    });
                }
                return null;
            }
        } else {
            const container = element;
            if (!container.clientWidth || !container.clientHeight) {
                if (_retry < 5) {
                    requestAnimationFrame(() => {
                        if (element.isConnected) autoFitText(element, skipHarmonize, _retry + 1);
                    });
                }
                return null;
            }
            let minSize = 10;
            let maxSize = 500;
            optimal = minSize;

            // Pendant la mesure, aligner en haut à gauche : avec
            // `align-items:center` le dépassement part en haut ET en bas,
            // scrollHeight sous-estime la taille réelle → police trop grande
            // qui vient toucher / chevaucher la ligne de découpe.
            const prevAlign = container.style.alignItems;
            const prevJustify = container.style.justifyContent;
            container.style.alignItems = 'flex-start';
            container.style.justifyContent = 'flex-start';

            // Tolérance sous-pixels : scrollHeight vaut au minimum clientHeight,
            // donc "ça tient" = scroll <= client + 1 (jamais client - marge).
            const tolerance = 1;

            container.style.fontSize = minSize + 'px';

            while (minSize <= maxSize) {
                let mid = Math.floor((minSize + maxSize) / 2);
                container.style.fontSize = mid + 'px';

                if (container.scrollHeight <= container.clientHeight + tolerance && container.scrollWidth <= container.clientWidth + tolerance) {
                    optimal = mid;
                    minSize = mid + 1;
                } else {
                    maxSize = mid - 1;
                }
            }

            container.style.fontSize = optimal + 'px';
            container.style.alignItems = prevAlign;
            container.style.justifyContent = prevJustify;
        }

        if (!skipHarmonize && harmonizeEnabled) {
            const page = element.closest('.a4-page');
            if (page) harmonizeFontSize(page);
        }
        if (typeof updateAutoLabel === 'function') updateAutoLabel();
        return optimal;
    }

    let harmonizeEnabled = true;
    let uppercaseEnabled = false;
    let textAlign = 'center';

    function applyTextAlign() {
        const left = textAlign === 'left';
        document.querySelectorAll('.a4-page').forEach(page => {
            page.classList.toggle('align-left', left);
        });
        btnAlignCenter.classList.toggle('active', !left);
        btnAlignLeft.classList.toggle('active', left);
    }

    // Texte affiché : en majuscules si le mode est actif (le placeholder
    // et les cases vides restent inchangés). currentData garde la casse
    // d'origine, le mode est donc réversible.
    function displayText(text) {
        if (!uppercaseEnabled) return text;
        if (!text || text === placeholderText) return text;
        return text.toLocaleUpperCase('fr-FR');
    }

    // Harmonisation GLOBALE (toutes les pages) : l'ancienne version par page
    // laissait des tailles différentes d'une page à l'autre après import
    // (ex: 6 lignes en tiers -> page 1 à 116px, page 2 à 232px), et le bouton
    // déjà actif semblait alors "ne pas fonctionner".
    function harmonizeAllPages() {
        const areas = Array.from(document.querySelectorAll('.editable-area'));
        let minSize;
        if (FU) {
            // Ignore les zones pas encore ajustées (fontSize vide) : c'est
            // ce qui écrasait tout à 10px après "Importer Liste".
            // Retourne null si aucune zone ajustée → ne touche à rien.
            minSize = FU.harmonizeAreas(areas);
        } else {
            const parsed = areas.map(a => { const n = parseInt(a.style.fontSize, 10); return Number.isFinite(n) && n > 0 ? n : null; });
            const valid = parsed.filter(n => n !== null);
            if (valid.length === 0) { updateAutoLabel(); return null; }
            minSize = Math.min(...valid);
            areas.forEach(a => { a.style.fontSize = minSize + 'px'; });
        }
        updateAutoLabel();
        return minSize;
    }

    function harmonizeFontSize(page) {
        void page;
        return harmonizeAllPages();
    }

    // Function to create a page
    // Ajuste toutes les zones d'abord, puis harmonise une seule fois :
    // sinon chaque ajustement individuel serait ramené au min des zones
    // pas encore ajustées (10px par défaut), et tout resterait minuscule.
    function createPage(layoutClass, items, isLandscape) {
        const page = document.createElement('div');
        page.className = `a4-page ${layoutClass} ${isLandscape ? 'landscape' : ''}`;
        page.style.fontFamily = fontSelector.value;
        if (textAlign === 'left') page.classList.add('align-left');

        items.forEach(text => {
            const area = document.createElement('div');
            area.className = 'editable-area';
            area.contentEditable = true;
            area.innerText = displayText(text);
            page.appendChild(area);
        });

        const fitAll = (retry = 0) => {
            const areas = Array.from(page.querySelectorAll('.editable-area'));
            const results = areas.map(area => autoFitText(area, true));
            if (harmonizeEnabled) {
                const min = harmonizeFontSize(page);
                // Si rien n'était mesurable (layout pas prêt), réessayer.
                if (min === null && results.includes(null) && retry < 5 && page.isConnected) {
                    requestAnimationFrame(() => fitAll(retry + 1));
                    return;
                }
            } else {
                updateAutoLabel();
                if (results.includes(null) && retry < 5 && page.isConnected) {
                    requestAnimationFrame(() => fitAll(retry + 1));
                }
            }
        };

        // Double rAF pour attendre la mise en page, + re-ajustement
        // quand la police web (ex: Caveat Brush) est chargée.
        requestAnimationFrame(() => requestAnimationFrame(fitAll));
        setTimeout(fitAll, 50);
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => {
                if (page.isConnected) fitAll();
            });
        }

        return page;
    }

    // Main render function
    function renderPages() {
        pageContainer.innerHTML = '';
        
        // Split data into chunks based on currentCount
        for (let i = 0; i < currentData.length; i += currentCount) {
            const chunk = currentData.slice(i, i + currentCount);
            // Fill remaining spots in the last page if needed
            while (chunk.length < currentCount) {
                chunk.push('');
            }
            const page = createPage(currentLayout, chunk, currentIsLandscape);
            pageContainer.appendChild(page);
        }

        // Update body class for print orientation
        if (currentIsLandscape) {
            document.body.classList.add('landscape-page-print');
        } else {
            document.body.classList.remove('landscape-page-print');
        }
    }

    // Relit les pages dans currentData avant un re-rendu, pour que les saisies
    // manuelles survivent à un changement de mise en page. Relire le DOM est
    // plus sûr que de suivre chaque événement d'édition (un glisser-déposer ou
    // une saisie IME ne déclenche pas toujours `input`).
    // Une zone non modifiée garde sa valeur stockée : currentData conserve la
    // casse d'origine, le mode majuscules reste donc réversible.
    function syncFromDOM() {
        const areas = Array.from(pageContainer.querySelectorAll('.editable-area'));
        if (!areas.length) return;

        const texts = areas.map((area, i) => {
            const stored = currentData[i] ?? '';
            if (area.innerText === displayText(stored)) return stored;
            return area.innerText === placeholderText ? '' : area.innerText;
        });
        // Cases de remplissage de la dernière page : sans ça la liste gonfle
        // à chaque passage en 16 rectangles et crée des pages blanches.
        while (texts.length && texts[texts.length - 1] === '') texts.pop();
        currentData = texts.length ? texts : [placeholderText];
    }

    // Update layout state and render
    function setLayout(layoutClass, count, isLandscape = false) {
        syncFromDOM();
        currentLayout = layoutClass;
        currentCount = count;
        currentIsLandscape = isLandscape;

        // Update buttons state
        [btnFull, btnThirds, btnHalves, btnEight, btnSixteen].forEach(btn => btn.classList.remove('active'));
        if (layoutClass === 'layout-full') btnFull.classList.add('active');
        if (layoutClass === 'layout-thirds') btnThirds.classList.add('active');
        if (layoutClass === 'layout-halves') btnHalves.classList.add('active');
        if (layoutClass === 'layout-eight') btnEight.classList.add('active');
        if (layoutClass === 'layout-sixteen') btnSixteen.classList.add('active');

        renderPages();
    }

    // Event Listeners for Layout
    btnFull.addEventListener('click', () => setLayout('layout-full', 1, true));
    btnThirds.addEventListener('click', () => setLayout('layout-thirds', 3, false));
    btnHalves.addEventListener('click', () => setLayout('layout-halves', 2, true));
    btnEight.addEventListener('click', () => setLayout('layout-eight', 8, false));
    btnSixteen.addEventListener('click', () => setLayout('layout-sixteen', 16, true));

    // Import logic (fenêtre modale)
    const importModal = document.getElementById('import-modal');
    const importText = document.getElementById('import-text');
    const importCount = document.getElementById('import-count');
    const btnDoImport = document.getElementById('btn-do-import');
    const btnCancelImport = document.getElementById('btn-cancel-import');

    function parseImportLines(text) {
        return text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    }

    function updateImportCount() {
        const n = parseImportLines(importText.value).length;
        const pages = Math.max(1, Math.ceil(n / currentCount));
        importCount.textContent = n === 0
            ? 'Liste vide'
            : `${n} ligne${n > 1 ? 's' : ''} → ${pages} page${pages > 1 ? 's' : ''}`;
        btnDoImport.disabled = n === 0;
    }

    function openImportModal() {
        importText.value = (currentData.length === 1 && currentData[0] === placeholderText)
            ? ''
            : currentData.join('\n');
        updateImportCount();
        importModal.hidden = false;
        importText.focus();
    }

    function closeImportModal() {
        importModal.hidden = true;
    }

    function confirmImport() {
        currentData = parseImportLines(importText.value);
        if (currentData.length === 0) currentData = [placeholderText];
        closeImportModal();
        renderPages();
    }

    btnImport.addEventListener('click', openImportModal);
    btnCancelImport.addEventListener('click', closeImportModal);
    btnDoImport.addEventListener('click', confirmImport);
    importModal.addEventListener('click', (e) => {
        if (e.target === importModal) closeImportModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !importModal.hidden) closeImportModal();
    });
    importText.addEventListener('input', updateImportCount);
    importText.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !btnDoImport.disabled) {
            e.preventDefault();
            confirmImport();
        }
    });

    // Reset logic
    btnReset.addEventListener('click', () => {
        if (confirm("Voulez-vous vraiment tout effacer ?")) {
            currentData = [placeholderText];
            renderPages();
        }
    });

    // Strip formatting on paste
    pageContainer.addEventListener('paste', (e) => {
        if (!e.target.classList.contains('editable-area')) return;
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, text);
    });

    // Handle input for auto-fit
    pageContainer.addEventListener('input', (e) => {
        if (e.target.classList.contains('editable-area')) {
            autoFitText(e.target);
            
            // Update currentData when user edits manually
            // This is a bit complex with multi-page, so we'll just re-fit the target
        }
    });

    // Font selection
    fontSelector.addEventListener('change', (e) => {
        document.querySelectorAll('.a4-page').forEach(page => {
            page.style.fontFamily = e.target.value;
        });
        // Ajustement par lot : d'abord tout ajuster sans harmoniser,
        // puis harmoniser globalement (sinon tout s'écrase au min).
        const areas = Array.from(document.querySelectorAll('.editable-area'));
        areas.forEach(a => autoFitText(a, true));
        if (harmonizeEnabled) {
            harmonizeAllPages();
        } else {
            updateAutoLabel();
        }
    });

    function updateAutoLabel() {
        const areas = Array.from(document.querySelectorAll('.editable-area'));
        const autoOption = sizeSelector.querySelector('option[value="auto"]');
        if (areas.length === 0) { autoOption.textContent = 'Auto'; return; }
        const sizes = areas.map(a => parseInt(a.style.fontSize) || 0);
        const allSame = sizes.every(s => s === sizes[0]);
        autoOption.textContent = allSame ? `Auto (${sizes[0]})` : 'Auto';
    }

    // Size selection
    sizeSelector.addEventListener('change', () => {
        const areas = Array.from(document.querySelectorAll('.editable-area'));
        areas.forEach(a => autoFitText(a, true));
        if (sizeSelector.value === 'auto' && harmonizeEnabled) {
            harmonizeAllPages();
        } else {
            updateAutoLabel();
        }
    });

    // Print & PDF
    // Le <style> d'orientation est persistant : le supprimer juste après
    // window.print() arrivait trop tôt (print asynchrone) et l'orientation
    // retombait sur le @page par défaut → pages suivantes mal calibrées.
    function ensurePrintStyle() {
        let el = document.getElementById('print-page-size');
        if (!el) {
            el = document.createElement('style');
            el.id = 'print-page-size';
            document.head.appendChild(el);
        }
        return el;
    }
    function triggerPrint(filename = 'Document') {
        const oldTitle = document.title;
        document.title = filename;
        const orientation = currentIsLandscape ? 'landscape' : 'portrait';
        const pageStyle = ensurePrintStyle();
        pageStyle.textContent = `@media print { @page { size: A4 ${orientation}; margin: 0; } }`;
        window.onafterprint = () => {
            document.title = oldTitle;
            window.onafterprint = null;
        };
        window.print();
    }

    btnHarmonize.addEventListener('click', () => {
        harmonizeEnabled = !harmonizeEnabled;
        btnHarmonize.classList.toggle('active', harmonizeEnabled);
        if (harmonizeEnabled) harmonizeAllPages();
    });

    btnUppercase.addEventListener('click', () => {
        syncFromDOM();
        uppercaseEnabled = !uppercaseEnabled;
        btnUppercase.classList.toggle('active', uppercaseEnabled);
        renderPages();
    });

    // Alignement : pas de ré-ajustement nécessaire (même largeur de
    // retour à la ligne en centré et à gauche), centrage vertical conservé.
    btnAlignCenter.addEventListener('click', () => {
        textAlign = 'center';
        applyTextAlign();
    });

    btnAlignLeft.addEventListener('click', () => {
        textAlign = 'left';
        applyTextAlign();
    });

    btnPrint.addEventListener('click', () => triggerPrint('Bandelettes'));
    btnPdf.addEventListener('click', () => triggerPrint('Bandelettes'));

    // Handle clicking placeholder text
    pageContainer.addEventListener('focusin', (e) => {
        if (e.target.innerText === placeholderText) {
            e.target.innerText = '';
        }
    });

    pageContainer.addEventListener('focusout', (e) => {
        if (e.target.innerText.trim() === '') {
            e.target.innerText = placeholderText;
        }
    });

    // Initialize
    btnHarmonize.classList.add('active');
    setLayout('layout-full', 1, true);
});
