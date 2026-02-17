import { CHIPS } from '../data/chips.js';
import { EFFECT_STATS, formatEffect, formatComputedEffect } from '../data/effects.js';
import { settings } from '../model/settings.js';

function buildEffectLine(effect, totalStats) {
    const text = settings.computedMode ? formatComputedEffect(effect, totalStats) : formatEffect(effect);
    const stat = EFFECT_STATS[effect.id];
    const statIcon = stat
        ? `<img class="effect-stat-icon" src="public/image/charac/${stat}.png" alt="${stat}">`
        : '';
    return `<div class="chip-effect-line">${statIcon}<span class="chip-effect-text">${text}</span></div>`;
}

function buildEffectsHtml(effects, totalStats) {
    return effects.map(e => buildEffectLine(e, totalStats)).join('');
}

function buildChipMeta(chip) {
    const uses = chip.max_uses > 0 ? `${chip.max_uses}/turn` : '';
    const cooldown = chip.cooldown > 0 ? `${chip.cooldown}t cd` : '';
    return `<div class="chip-meta">
        <span class="chip-cost"><img src="public/image/charac/tp.png" alt="TP">${chip.cost} TP</span>
        ${cooldown ? `<span class="chip-cooldown">${cooldown}</span>` : ''}
        ${uses ? `<span class="chip-uses">${uses}</span>` : ''}
    </div>`;
}

function buildEquippedChip(chip, index, overflow, totalStats) {
    const overflowClass = overflow ? ' overflow' : '';
    return `<div class="chip-slot filled${overflowClass}" data-index="${index}">
        <div class="chip-icon">
            <img src="public/image/chip/${chip.name}.png" alt="${chip.name}">
        </div>
        <div class="chip-info">
            <span class="chip-name">${chip.name.replace(/_/g, ' ')}</span>
            <span class="chip-level">Lvl ${chip.level}</span>
            ${buildChipMeta(chip)}
            <div class="chip-effects">${buildEffectsHtml(chip.effects, totalStats)}</div>
        </div>
    </div>`;
}

function renderEquippedChips(leek) {
    const list = document.querySelector('.equipped-chips-list');
    const totalStats = leek.getTotalStats();
    const totalRam = totalStats.ram;
    const count = leek.chips.length;

    // Update counter
    const countEl = document.querySelector('.chips-count');
    const maxEl = document.querySelector('.chips-max');
    const counterEl = document.querySelector('.chips-counter');
    countEl.textContent = count.toString();
    maxEl.textContent = totalRam;
    counterEl.classList.toggle('overflow', count > totalRam);

    if (count === 0) {
        list.innerHTML = '<div class="chip-slot empty"><span class="slot-placeholder">No chips equipped</span></div>';
        return;
    }
    list.innerHTML = leek.chips.map((chip, i) => buildEquippedChip(chip, i, i >= totalRam, totalStats)).join('');
}

function buildChipCard(chip, totalStats) {
    return `<div class="chip-card" data-id="${chip.id}" data-type="${chip.type}" data-level="${chip.level}">
        <div class="chip-icon">
            <img src="public/image/chip/${chip.name}.png" alt="${chip.name}">
        </div>
        <div class="chip-info">
            <span class="chip-name">${chip.name.replace(/_/g, ' ')}</span>
            <span class="chip-level">Lvl ${chip.level}</span>
            ${buildChipMeta(chip)}
            <div class="chip-effects">${buildEffectsHtml(chip.effects, totalStats)}</div>
        </div>
    </div>`;
}

function applyLevelFilter(leekLevel, showAll) {
    document.querySelectorAll('.chip-card').forEach(card => {
        const chipLevel = parseInt(card.dataset.level, 10);
        card.classList.toggle('over-level', !showAll && chipLevel > leekLevel);
    });
}

function updateEquippedState(leek) {
    const equippedIds = new Set(leek.chips.map(c => String(c.id)));
    document.querySelectorAll('.chip-card').forEach(card => {
        card.classList.toggle('equipped', equippedIds.has(card.dataset.id));
    });
}

function sortChips(chips, mode) {
    const sorted = chips.slice();
    if (mode === 'level') {
        sorted.sort((a, b) => b.level - a.level);
    } else {
        sorted.sort((a, b) => a.type - b.type || a.level - b.level);
    }
    return sorted;
}

function renderChipsList(chipsList, chips, leek) {
    const totalStats = leek.getTotalStats();
    chipsList.innerHTML = chips.map(chip => buildChipCard(chip, totalStats)).join('');
    updateEquippedState(leek);
}

export function initChipsTab(leek) {
    const equippedList = document.querySelector('.equipped-chips-list');
    const chipsList = document.querySelector('.chips-list');
    const sortToggle = document.querySelector('.chips-sort-toggle');
    const showAllToggle = document.querySelector('.chips-show-all-toggle');

    const allChips = Object.values(CHIPS);
    let sortMode = 'type';
    let showAll = false;

    // Initial render
    renderEquippedChips(leek);
    renderChipsList(chipsList, sortChips(allChips, sortMode), leek);
    applyLevelFilter(leek.level, showAll);

    // Show all toggle
    showAllToggle.addEventListener('click', () => {
        showAll = !showAll;
        showAllToggle.classList.toggle('active', showAll);
        showAllToggle.textContent = showAll ? 'All levels' : 'My level';
        applyLevelFilter(leek.level, showAll);
    });

    // Sort toggle
    sortToggle.addEventListener('click', () => {
        sortMode = sortMode === 'level' ? 'type' : 'level';
        sortToggle.textContent = sortMode === 'level' ? 'Sort: Level' : 'Sort: Type';
        renderChipsList(chipsList, sortChips(allChips, sortMode), leek);
        applyLevelFilter(leek.level, showAll);
    });

    // Click a chip card to equip or unequip
    chipsList.addEventListener('click', (e) => {
        const card = e.target.closest('.chip-card');
        if (!card) return;
        const id = card.dataset.id;
        const equippedIndex = leek.chips.findIndex(c => String(c.id) === id);
        if (equippedIndex !== -1) {
            leek.removeChip(equippedIndex);
        } else {
            const chip = CHIPS[id];
            if (chip) {
                leek.addChip(chip);
            }
        }
    });

    // Click an equipped chip to remove it
    equippedList.addEventListener('click', (e) => {
        const slot = e.target.closest('.chip-slot.filled');
        if (!slot) return;
        const index = parseInt(slot.dataset.index, 10);
        leek.removeChip(index);
    });

    // Re-render when chips change
    leek.on('chips', () => {
        renderEquippedChips(leek);
        updateEquippedState(leek);
    });

    // Re-render counter when stats change (RAM may change)
    leek.on('level', () => {
        renderEquippedChips(leek);
        applyLevelFilter(leek.level, showAll);
    });
    leek.on('stats', () => {
        renderEquippedChips(leek);
        if (settings.computedMode) renderChipsList(chipsList, sortChips(allChips, sortMode), leek);
    });
    leek.on('components', () => {
        renderEquippedChips(leek);
        if (settings.computedMode) renderChipsList(chipsList, sortChips(allChips, sortMode), leek);
    });
    leek.on('computed', () => {
        renderEquippedChips(leek);
        renderChipsList(chipsList, sortChips(allChips, sortMode), leek);
        applyLevelFilter(leek.level, showAll);
    });
}
