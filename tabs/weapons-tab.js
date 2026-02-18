import { WEAPONS } from '../data/weapons.js';
import { EFFECT_STATS, formatEffect, formatComputedEffect } from '../data/effects.js';
import { buildRangeHtml } from '../data/range.js';
import { settings } from '../model/settings.js';

function getMaxWeapons(level) {
    if (level >= 200) return 4;
    if (level >= 100) return 3;
    return 2;
}

// Filter definitions: effect id → label
const WEAPON_FILTERS = [
    { effectId: 1, label: 'Damage', icon: 'strength' },
    { effectId: 13, label: 'Poison', icon: 'magic' },
    { effectId: 2, label: 'Heal', icon: 'wisdom' },
    { effectId: 30, label: 'Nova', icon: 'science' },
];

function buildEffectLine(effect, totalStats) {
    const text = settings.computedMode ? formatComputedEffect(effect, totalStats) : formatEffect(effect);
    const stat = EFFECT_STATS[effect.id];
    const statIcon = stat
        ? `<img class="effect-stat-icon" src="public/image/charac/${stat}.png" alt="${stat}">`
        : '';
    return `<div class="weapon-effect-line">${statIcon}<span class="weapon-effect-text">${text}</span></div>`;
}

function buildEffectsHtml(effects, totalStats) {
    return effects.map(e => buildEffectLine(e, totalStats)).join('');
}

function buildWeaponMeta(weapon) {
    const uses = weapon.max_uses > 0 ? `${weapon.max_uses}/turn` : '';
    return `<div class="weapon-meta">
        <span class="weapon-cost"><img src="public/image/charac/tp.png" alt="TP">${weapon.cost} TP</span>
        ${uses ? `<span class="weapon-uses">${uses}</span>` : ''}
    </div>
    ${buildRangeHtml(weapon)}`;
}

function buildEquippedWeapon(weapon, index, maxWeapons, totalStats, leekLevel) {
    const overflow = index >= maxWeapons ? ' overflow' : '';
    const overLevelClass = weapon.level > leekLevel ? ' over-level' : '';
    return `<div class="weapon-slot filled${overflow}${overLevelClass}" data-index="${index}">
        <span class="slot-number">${index + 1}</span>
        <div class="weapon-icon">
            <img src="public/image/weapon/${weapon.name}.png" alt="${weapon.name}">
        </div>
        <div class="weapon-info">
            <span class="weapon-name">${weapon.name.replace(/_/g, ' ')}</span>
            <span class="weapon-level">Lvl ${weapon.level}</span>
            ${buildWeaponMeta(weapon)}
            <hr class="meta-separator">
            <div class="weapon-effects">${buildEffectsHtml(weapon.effects, totalStats)}</div>
        </div>
    </div>`;
}

function buildEmptyWeaponSlot(index) {
    return `<div class="weapon-slot empty" data-index="${index}">
        <span class="slot-number">${index + 1}</span>
        <span class="slot-placeholder">Empty</span>
    </div>`;
}

function renderEquippedWeapons(leek) {
    const list = document.querySelector('.equipped-weapons-list');
    const count = leek.weapons.length;
    const maxWeapons = getMaxWeapons(leek.level);
    const totalStats = leek.getTotalStats();

    // Update counter
    const countEl = document.querySelector('.weapons-count');
    const maxEl = document.querySelector('.weapons-max');
    const counterEl = document.querySelector('.weapons-counter');
    countEl.textContent = count.toString();
    maxEl.textContent = maxWeapons.toString();
    counterEl.classList.toggle('overflow', count > maxWeapons);

    let html = '';
    const slotCount = Math.max(maxWeapons, count);
    for (let i = 0; i < slotCount; i++) {
        if (i < count) {
            html += buildEquippedWeapon(leek.weapons[i], i, maxWeapons, totalStats, leek.level);
        } else {
            html += buildEmptyWeaponSlot(i);
        }
    }
    list.innerHTML = html;
}

function buildWeaponCard(weapon, totalStats) {
    const forgottenClass = weapon.forgotten ? ' forgotten' : '';
    const effectIds = [...new Set(weapon.effects.map(e => e.id))].join(',');
    return `<div class="weapon-card${forgottenClass}" data-id="${weapon.id}" data-effects="${effectIds}" data-level="${weapon.level}">
        <div class="weapon-icon">
            <img src="public/image/weapon/${weapon.name}.png" alt="${weapon.name}">
        </div>
        <div class="weapon-info">
            <span class="weapon-name">${weapon.name.replace(/_/g, ' ')}</span>
            <span class="weapon-level">Lvl ${weapon.level}</span>
            ${buildWeaponMeta(weapon)}
            <hr class="meta-separator">
            <div class="weapon-effects">${buildEffectsHtml(weapon.effects, totalStats)}</div>
        </div>
    </div>`;
}

function applyLevelFilter(leekLevel, showAll) {
    document.querySelectorAll('.weapon-card').forEach(card => {
        const weaponLevel = parseInt(card.dataset.level, 10);
        const isOverLevel = weaponLevel > leekLevel;
        card.classList.toggle('over-level', isOverLevel);
        card.classList.toggle('level-hidden', !showAll && isOverLevel);
    });
}

function updateEquippedState(leek) {
    const equippedIds = new Set(leek.weapons.map(w => String(w.id)));
    document.querySelectorAll('.weapon-card').forEach(card => {
        card.classList.toggle('equipped', equippedIds.has(card.dataset.id));
    });
}

function buildFilterButtons() {
    return WEAPON_FILTERS.map(f =>
        `<button class="weapon-filter" data-effect="${f.effectId}">
            <img src="public/image/charac/${f.icon}.png" alt="${f.label}">
            <span>${f.label}</span>
        </button>`
    ).join('');
}

function applyFilters(activeEffects) {
    document.querySelectorAll('.weapon-card').forEach(card => {
        const cardEffects = card.dataset.effects.split(',');
        const visible = activeEffects.length === 0
            || activeEffects.some(e => cardEffects.includes(String(e)));
        card.classList.toggle('hidden', !visible);
    });
}

function sortWeapons(weapons, mode) {
    const sorted = weapons.slice();
    if (mode === 'level') {
        sorted.sort((a, b) => b.level - a.level);
    } else {
        sorted.sort((a, b) => a.level - b.level);
    }
    return sorted;
}

function renderWeaponsList(weaponsList, weapons, leek) {
    const totalStats = leek.getTotalStats();
    weaponsList.innerHTML = weapons.map(weapon => buildWeaponCard(weapon, totalStats)).join('');
    updateEquippedState(leek);
}

export function initWeaponsTab(leek) {
    const equippedList = document.querySelector('.equipped-weapons-list');
    const weaponsList = document.querySelector('.weapons-list');
    const sortToggle = document.querySelector('.weapons-sort-toggle');
    const filtersContainer = document.querySelector('.weapons-filters');
    const showAllToggle = document.querySelector('.weapons-show-all-toggle');
    const forgottenToggle = document.querySelector('.weapons-forgotten-toggle');

    const allWeapons = Object.values(WEAPONS);
    let sortMode = 'level';
    let activeEffects = [];
    let showAll = false;
    let showForgotten = false;

    // Build filter buttons
    filtersContainer.innerHTML = buildFilterButtons();

    // Initial render
    renderEquippedWeapons(leek);
    renderWeaponsList(weaponsList, sortWeapons(allWeapons, sortMode), leek);
    applyLevelFilter(leek.level, showAll);

    // Show all toggle
    showAllToggle.addEventListener('click', () => {
        showAll = !showAll;
        showAllToggle.classList.toggle('active', showAll);
        showAllToggle.textContent = showAll ? 'All levels' : 'My level';
        applyLevelFilter(leek.level, showAll);
    });

    // Forgotten toggle
    forgottenToggle.addEventListener('click', () => {
        showForgotten = !showForgotten;
        forgottenToggle.classList.toggle('active', showForgotten);
        document.querySelector('.weapons-list').classList.toggle('only-forgotten', showForgotten);
    });

    // Filter toggle
    filtersContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.weapon-filter');
        if (!btn) return;
        const effectId = parseInt(btn.dataset.effect, 10);
        btn.classList.toggle('active');
        if (activeEffects.includes(effectId)) {
            activeEffects = activeEffects.filter(id => id !== effectId);
        } else {
            activeEffects.push(effectId);
        }
        applyFilters(activeEffects);
    });

    // Sort toggle
    sortToggle.addEventListener('click', () => {
        sortMode = sortMode === 'level' ? 'name' : 'level';
        sortToggle.textContent = sortMode === 'level' ? 'Sort: Level' : 'Sort: Name';
        renderWeaponsList(weaponsList, sortWeapons(allWeapons, sortMode), leek);
        applyFilters(activeEffects);
        applyLevelFilter(leek.level, showAll);
    });

    // Click a weapon card to equip or unequip
    weaponsList.addEventListener('click', (e) => {
        const card = e.target.closest('.weapon-card');
        if (!card) return;
        const id = card.dataset.id;
        const equippedIndex = leek.weapons.findIndex(w => String(w.id) === id);
        if (equippedIndex !== -1) {
            leek.removeWeapon(equippedIndex);
        } else {
            const weapon = WEAPONS[id];
            if (weapon) {
                leek.addWeapon(weapon);
            }
        }
    });

    // Click an equipped weapon to remove it
    equippedList.addEventListener('click', (e) => {
        const slot = e.target.closest('.weapon-slot.filled');
        if (!slot) return;
        const index = parseInt(slot.dataset.index, 10);
        leek.removeWeapon(index);
    });

    // Re-render when weapons change
    leek.on('weapons', () => {
        renderEquippedWeapons(leek);
        updateEquippedState(leek);
    });

    // Re-render slots when level changes (max weapons depends on level)
    leek.on('level', () => {
        renderEquippedWeapons(leek);
        applyLevelFilter(leek.level, showAll);
    });
    leek.on('stats', () => {
        if (settings.computedMode) {
            renderEquippedWeapons(leek);
            renderWeaponsList(weaponsList, sortWeapons(allWeapons, sortMode), leek);
            applyFilters(activeEffects);
            applyLevelFilter(leek.level, showAll);
        }
    });
    leek.on('components', () => {
        if (settings.computedMode) {
            renderEquippedWeapons(leek);
            renderWeaponsList(weaponsList, sortWeapons(allWeapons, sortMode), leek);
            applyFilters(activeEffects);
            applyLevelFilter(leek.level, showAll);
        }
    });
    leek.on('computed', () => {
        renderEquippedWeapons(leek);
        renderWeaponsList(weaponsList, sortWeapons(allWeapons, sortMode), leek);
        applyFilters(activeEffects);
        applyLevelFilter(leek.level, showAll);
    });
}
