import { COMPONENTS } from '../data/components.js';
import { ITEMS } from '../data/items.js';

const MAX_COMPONENTS = 8;

const STAT_NAMES = [
    'life', 'strength', 'wisdom', 'resistance', 'agility', 'science',
    'magic', 'frequency', 'cores', 'ram', 'tp', 'mp',
];

// Build a lookup: component id → level (from items via template)
function getComponentLevel(component) {
    const item = ITEMS[String(component.template)];
    return item ? item.level : 0;
}

function buildEquippedComponent(component, index) {
    const level = getComponentLevel(component);
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
            <span class="component-level">Lvl ${level}</span>
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
    const level = getComponentLevel(component);
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

    return `<div class="component-card" data-id="${component.id}" data-stats="${statNames.join(',')}" data-level="${level}">
        <div class="component-icon">
            <img src="public/image/component/${component.name}.png" alt="${component.name}">
        </div>
        <div class="component-info">
            <span class="component-name">${component.name.replace(/_/g, ' ')}</span>
            <span class="component-level">Lvl ${level}</span>
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

function applyLevelFilter(leekLevel, showAll) {
    document.querySelectorAll('.component-card').forEach(card => {
        const compLevel = parseInt(card.dataset.level, 10);
        card.classList.toggle('over-level', !showAll && compLevel > leekLevel);
    });
}

export function initComponentsTab(leek) {
    const equippedList = document.querySelector('.equipped-list');
    const filtersContainer = document.querySelector('.components-filters');
    const componentsList = document.querySelector('.components-list');
    const showAllToggle = document.querySelector('.components-show-all-toggle');

    let showAll = false;

    // Initial render of equipped slots
    renderEquippedList(leek);

    // Build stat filters
    filtersContainer.innerHTML = buildStatFilters();

    // Build all components list sorted by level descending
    const allComponents = Object.values(COMPONENTS).slice();
    allComponents.sort((a, b) => getComponentLevel(b) - getComponentLevel(a));

    componentsList.innerHTML = allComponents.map(c => buildComponentCard(c)).join('');
    updateEquippedState(leek);
    applyLevelFilter(leek.level, showAll);

    // Show all toggle
    showAllToggle.addEventListener('click', () => {
        showAll = !showAll;
        showAllToggle.classList.toggle('active', showAll);
        showAllToggle.textContent = showAll ? 'All levels' : 'My level';
        applyLevelFilter(leek.level, showAll);
    });

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

    // Re-apply level filter when level changes
    leek.on('level', () => applyLevelFilter(leek.level, showAll));

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
