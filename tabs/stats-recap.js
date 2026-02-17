// Updates the recap zone stats display with current leek stats

function updateRecapComponents(leek) {
    for (let i = 1; i <= 8; i++) {
        const slot = document.querySelector(`[data-slot="component-${i}"]`);
        if (!slot) continue;
        const component = leek.components[i - 1];
        if (component) {
            slot.classList.remove('empty');
            slot.innerHTML = `<img src="public/image/component/${component.name}.png" alt="${component.name}">`;
        } else {
            slot.classList.add('empty');
            slot.innerHTML = '';
        }
    }
}

function updateRecapWeapons(leek) {
    const list = document.querySelector('.recap-weapons-list');
    if (!list) return;
    if (leek.weapons.length === 0) {
        list.innerHTML = '';
        return;
    }
    list.innerHTML = leek.weapons.map(w =>
        `<div class="recap-item"><img src="public/image/weapon/${w.name}.png" alt="${w.name}"><span>${w.name.replace(/_/g, ' ')}</span></div>`
    ).join('');
}

function updateRecapChips(leek) {
    const list = document.querySelector('.recap-chips-list');
    if (!list) return;
    if (leek.chips.length === 0) {
        list.innerHTML = '';
        return;
    }
    list.innerHTML = leek.chips.map(c =>
        `<div class="recap-item"><img src="public/image/chip/${c.name}.png" alt="${c.name}"><span>${c.name.replace(/_/g, ' ')}</span></div>`
    ).join('');
}

export function updateRecapStats(leek) {
    const statElements = document.querySelectorAll('.recap-stats .recap-stat');
    const totalStats = leek.getTotalStats();

    statElements.forEach(element => {
        const statName = element.dataset.stat;
        const valueSpan = element.querySelector('span');

        if (statName && valueSpan && totalStats[statName] !== undefined) {
            valueSpan.textContent = totalStats[statName];
        }
    });
}

export function initRecapStats(leek) {
    // Initialize level input
    const levelInput = document.getElementById('leek-level');

    if (levelInput) {
        levelInput.value = leek.level;

        const onLevelChange = () => {
            const level = parseInt(levelInput.value, 10) || 1;
            leek.setLevel(level);
            levelInput.value = leek.level;
        };
        levelInput.addEventListener('input', onLevelChange);
        levelInput.addEventListener('change', onLevelChange);
    }

    // Observe model changes to update recap
    leek.on('stats', () => updateRecapStats(leek));
    leek.on('level', () => updateRecapStats(leek));
    leek.on('components', () => {
        updateRecapComponents(leek);
        updateRecapStats(leek);
    });
    leek.on('chips', () => updateRecapChips(leek));
    leek.on('weapons', () => updateRecapWeapons(leek));

    // Initial update
    updateRecapStats(leek);
    updateRecapComponents(leek);
    updateRecapChips(leek);
    updateRecapWeapons(leek);
}
