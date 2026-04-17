const toggles = document.querySelectorAll('.menu-toggle');

toggles.forEach((toggle) => {
    toggle.addEventListener('click', () => {
        const group = toggle.closest('.menu-group');
        if (group) {
            group.classList.toggle('open');
        }
    });
});

// Abre os primeiros grupos por padrão
['Secretaria', 'Tesouraria'].forEach((label) => {
    toggles.forEach((toggle) => {
        if (toggle.textContent.includes(label)) {
            const group = toggle.closest('.menu-group');
            if (group) group.classList.add('open');
        }
    });
});
