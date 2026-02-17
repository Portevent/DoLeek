import { COMPONENTS } from '../data/components.js';

const MAX_COMPONENTS = 8;

const STAT_NAMES = [
    'life', 'strength', 'wisdom', 'resistance', 'agility', 'science',
    'magic', 'frequency', 'cores', 'ram', 'tp', 'mp',
];

function buildEquippedComponent(component, index) {
    const statsHtml = component.stats
        .map(([stat, value]) => {
            const sign = value > 0 ? '+' : '';
            return `<span class="component-stat color-${stat}">
                <img src="public/image/charac/${stat}.png" alt="${stat}">
                ${sign}${value}
            </span>`;
        })
        .join('');

    const overflow = index >= MAX_COMPONENTS ? ' overflow' : '';
    return `<div class="equipped-slot filled${overflow}" data-index="${index}">
        <span class="slot-number">${index + 1}</span>
        <div class="component-icon">
            <img src="public/image/component/${component.name}.png" alt="${component.name}">
        </div>
        <div class="component-info">
            <span class="component-name">${component.name.replace(/_/g, ' ')}</span>
            <div class="component-stats">${statsHtml}</div>
        </div>
    </div>`;
}

function buildEmptySlot(index) {
    return `<div class="equipped-slot empty" data-index="${index}">
        <span class="slot-number">${index + 1}</span>
        <span class="slot-placeholder">Empty</span>
    </div>`;
}

function renderEquippedList(leek) {
    const equippedList = document.querySelector('.equipped-list');
    let html = '';
    const slotCount = Math.max(MAX_COMPONENTS, leek.components.length);
    for (let i = 0; i < slotCount; i++) {
        if (i < leek.components.length) {
            html += buildEquippedComponent(leek.components[i], i);
        } else {
            html += buildEmptySlot(i);
        }
    }
    equippedList.innerHTML = html;
}

function buildComponentCard(component) {
    const statNames = component.stats.map(([stat]) => stat);
    const statsHtml = component.stats
        .map(([stat, value]) => {
            const sign = value > 0 ? '+' : '';
            return `<span class="component-stat color-${stat}">
                <img src="public/image/charac/${stat}.png" alt="${stat}">
                ${sign}${value}
            </span>`;
        })
        .join('');

    return `<div class="component-card" data-id="${component.id}" data-stats="${statNames.join(',')}">
        <div class="component-icon">
            <img src="public/image/component/${component.name}.png" alt="${component.name}">
        </div>
        <div class="component-info">
            <span class="component-name">${component.name.replace(/_/g, ' ')}</span>
            <div class="component-stats">${statsHtml}</div>
        </div>
    </div>`;
}

function buildStatFilters() {
    return STAT_NAMES.map(stat =>
        `<button class="stat-filter" data-stat="${stat}">
            <img src="public/image/charac/${stat}.png" alt="${stat}">
        </button>`
    ).join('');
}

function updateEquippedState(leek) {
    const equippedIds = new Set(leek.components.map(c => String(c.id)));
    document.querySelectorAll('.component-card').forEach(card => {
        card.classList.toggle('equipped', equippedIds.has(card.dataset.id));
    });
}

function applyFilters(activeStats) {
    const cards = document.querySelectorAll('.component-card');
    cards.forEach(card => {
        const cardStats = card.dataset.stats.split(',');
        const visible = activeStats.length === 0
            || activeStats.every(s => cardStats.includes(s));
        card.classList.toggle('hidden', !visible);
    });
}

export function initComponentsTab(leek) {
    const equippedList = document.querySelector('.equipped-list');
    const filtersContainer = document.querySelector('.components-filters');
    const componentsList = document.querySelector('.components-list');

    // Initial render of equipped slots
    renderEquippedList(leek);

    // Build stat filters
    filtersContainer.innerHTML = buildStatFilters();

    // Build all components list
    let allHtml = '';
    for (const key of Object.keys(COMPONENTS)) {
        allHtml += buildComponentCard(COMPONENTS[key]);
    }
    componentsList.innerHTML = allHtml;

    // Click a component card to equip or unequip it
    componentsList.addEventListener('click', (e) => {
        const card = e.target.closest('.component-card');
        if (!card) return;
        const id = card.dataset.id;
        const equippedIndex = leek.components.findIndex(c => String(c.id) === id);
        if (equippedIndex !== -1) {
            leek.removeComponent(equippedIndex);
        } else {
            const component = COMPONENTS[id];
            if (component) {
                leek.addComponent(component);
            }
        }
    });

    // Click an equipped slot to remove it
    equippedList.addEventListener('click', (e) => {
        const slot = e.target.closest('.equipped-slot.filled');
        if (!slot) return;
        const index = parseInt(slot.dataset.index, 10);
        leek.removeComponent(index);
    });

    // Re-render equipped list and update card states when components change
    leek.on('components', () => {
        renderEquippedList(leek);
        updateEquippedState(leek);
    });

    // Filter logic
    const activeStats = new Set();
    filtersContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.stat-filter');
        if (!btn) return;
        const stat = btn.dataset.stat;
        if (activeStats.has(stat)) {
            activeStats.delete(stat);
            btn.classList.remove('active');
        } else {
            activeStats.add(stat);
            btn.classList.add('active');
        }
        applyFilters([...activeStats]);
    });
}
