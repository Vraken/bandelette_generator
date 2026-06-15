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

    // Function to fit text to container
    function autoFitText(element) {
        const size = sizeSelector ? sizeSelector.value : 'auto';
        if (size !== 'auto') {
            element.style.fontSize = size + 'px';
            return;
        }

        const container = element;
        let minSize = 10;
        let maxSize = 500;
        let optimalSize = minSize;

        container.style.fontSize = minSize + 'px';

        while (minSize <= maxSize) {
            let mid = Math.floor((minSize + maxSize) / 2);
            container.style.fontSize = mid + 'px';

            if (container.scrollHeight <= container.clientHeight && container.scrollWidth <= container.clientWidth) {
                optimalSize = mid;
                minSize = mid + 1;
            } else {
                maxSize = mid - 1;
            }
        }

        container.style.fontSize = optimalSize + 'px';
        if (harmonizeEnabled) {
            const page = container.closest('.a4-page');
            if (page) harmonizeFontSize(page);
        }
        if (typeof updateAutoLabel === 'function') updateAutoLabel();
    }

    let harmonizeEnabled = true;

    function harmonizeFontSize(page) {
        const areas = page.querySelectorAll('.editable-area');
        const minSize = Math.min(...Array.from(areas).map(a => parseInt(a.style.fontSize) || 10));
        areas.forEach(a => { a.style.fontSize = minSize + 'px'; });
        updateAutoLabel();
    }

    // Function to create a page
    function createPage(layoutClass, items, isLandscape) {
        const page = document.createElement('div');
        page.className = `a4-page ${layoutClass} ${isLandscape ? 'landscape' : ''}`;
        page.style.fontFamily = fontSelector.value;

        items.forEach(text => {
            const area = document.createElement('div');
            area.className = 'editable-area';
            area.contentEditable = true;
            area.innerText = text;
            page.appendChild(area);
            setTimeout(() => autoFitText(area), 50);
        });

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

    // Update layout state and render
    function setLayout(layoutClass, count, isLandscape = false) {
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

    // Import logic
    btnImport.addEventListener('click', () => {
        const input = prompt("Collez votre liste ici (une ligne par rectangle) :");
        if (input !== null) {
            currentData = input.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            if (currentData.length === 0) currentData = [placeholderText];
            renderPages();
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
        document.querySelectorAll('.editable-area').forEach(autoFitText);
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
        document.querySelectorAll('.editable-area').forEach(autoFitText);
        if (sizeSelector.value === 'auto') updateAutoLabel();
    });

    // Print & PDF
    function triggerPrint(filename = 'Document') {
        const oldTitle = document.title;
        document.title = filename;
        const orientation = currentIsLandscape ? 'landscape' : 'portrait';
        const pageStyle = document.createElement('style');
        pageStyle.id = 'print-page-size';
        pageStyle.textContent = `@media print { @page { size: A4 ${orientation}; margin: 0; } }`;
        document.head.appendChild(pageStyle);
        window.print();
        document.head.removeChild(pageStyle);
        document.title = oldTitle;
    }

    btnHarmonize.addEventListener('click', () => {
        harmonizeEnabled = !harmonizeEnabled;
        btnHarmonize.classList.toggle('active', harmonizeEnabled);
        if (harmonizeEnabled) document.querySelectorAll('.a4-page').forEach(harmonizeFontSize);
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
