import { CHIPS } from '../data/chips.js';

// Compact effect descriptions keyed by effect id
const EFFECT_LABELS = {
    1: (v1, v2) => `${v1}–${v1 + v2} dmg`,
    2: (v1, v2) => `${v1}–${v1 + v2} heal`,
    3: (v1, v2) => v2 ? `+${v1}–${v1 + v2} str` : `+${v1} str`,
    4: (v1, v2) => v2 ? `+${v1}–${v1 + v2} agi` : `+${v1} agi`,
    5: (v1, v2) => v2 ? `-${v1}%–${v1 + v2}% dmg taken` : `-${v1}% dmg taken`,
    6: (v1, v2) => v2 ? `-${v1}–${v1 + v2} dmg taken` : `-${v1} dmg taken`,
    7: (v1, v2) => v2 ? `+${v1}–${v1 + v2} MP` : `+${v1} MP`,
    8: (v1, v2) => v2 ? `+${v1}–${v1 + v2} TP` : `+${v1} TP`,
    9: (v1) => `-${v1}% effects`,
    10: () => 'Teleport',
    11: () => 'Swap',
    12: (v1, v2) => v2 ? `+${v1}–${v1 + v2} max HP` : `+${v1} max HP`,
    13: (v1, v2) => v2 ? `${v1}–${v1 + v2} poison` : `${v1} poison`,
    14: () => 'Summon',
    15: () => 'Revive',
    16: () => 'Kill',
    17: (v1, v2) => v2 ? `-${v1}–${v1 + v2} MP` : `-${v1} MP`,
    18: (v1, v2) => v2 ? `-${v1}–${v1 + v2} TP` : `-${v1} TP`,
    19: (v1, v2) => v2 ? `-${v1}–${v1 + v2} str` : `-${v1} str`,
    20: (v1, v2) => v2 ? `${v1}%–${v1 + v2}% return` : `${v1}% return`,
    21: (v1, v2) => v2 ? `+${v1}–${v1 + v2} res` : `+${v1} res`,
    22: (v1, v2) => v2 ? `+${v1}–${v1 + v2} wis` : `+${v1} wis`,
    23: () => 'Cure poison',
    24: (v1, v2) => v2 ? `-${v1}–${v1 + v2} mag` : `-${v1} mag`,
    25: (v1, v2) => v2 ? `${v1}–${v1 + v2} aftereffects` : `${v1} aftereffects`,
    26: (v1) => `${v1}% vuln`,
    27: (v1) => `${v1} abs vuln`,
    28: (v1) => `${v1}% life dmg`,
    29: () => 'Give abs shields',
    30: (v1, v2) => v2 ? `${v1}–${v1 + v2} nova` : `${v1} nova`,
    31: (v1) => `+${v1} MP`,
    32: (v1) => `+${v1} TP`,
    33: (v1) => `${v1}% poison→sci`,
    34: (v1) => `${v1}% dmg→shield`,
    35: (v1) => `${v1}% dmg→str`,
    36: (v1) => `${v1}% nova→mag`,
    38: (v1, v2) => v2 ? `+${v1}–${v1 + v2} str` : `+${v1} str`,
    39: (v1, v2) => v2 ? `+${v1}–${v1 + v2} mag` : `+${v1} mag`,
    40: (v1) => `+${v1} sci`,
    41: (v1, v2) => v2 ? `+${v1}–${v1 + v2} agi` : `+${v1} agi`,
    42: (v1, v2) => v2 ? `+${v1}–${v1 + v2} res` : `+${v1} res`,
    43: (v1) => `Propagate ${v1}`,
    44: (v1, v2) => v2 ? `+${v1}–${v1 + v2} wis` : `+${v1} wis`,
    45: (v1, v2) => v2 ? `+${v1}–${v1 + v2} max HP` : `+${v1} max HP`,
    46: () => 'Attract',
    47: (v1, v2) => v2 ? `-${v1}–${v1 + v2} agi` : `-${v1} agi`,
    48: (v1, v2) => v2 ? `-${v1}–${v1 + v2} wis` : `-${v1} wis`,
    49: () => 'Remove shackles',
    50: (v1) => `+${v1} MP/move`,
    51: () => 'Push',
    53: (v1) => `Repel ${v1}`,
    54: (v1) => `${v1}% shield`,
    55: (v1) => `+${v1} agi/dead ally`,
    56: (v1) => `+${v1} TP/kill`,
    57: (v1) => `${v1} heal`,
    58: (v1, v2) => v2 ? `${v1}–${v1 + v2} heal/crit` : `${v1} heal/crit`,
    59: () => 'Add state',
};

// Stat that boosts each effect (null = no stat boost)
const EFFECT_STATS = {
    1: "strength",   // Damage
    2: "wisdom",   // Heal
    3: null,   // +Strength
    4: null,   // +Agility
    5: "resistance",   // -% Damage taken (relative shield)
    6: "resistance",   // -Damage taken (absolute shield)
    7: "science",   // +MP
    8: "science",   // +TP
    9: null,   // -% Effects
    10: null,  // Teleport
    11: null,  // Swap
    12: "wisdom",  // +Max HP
    13: "magic",  // Poison
    14: null,  // Summon
    15: null,  // Revive
    16: null,  // Kill
    17: null,  // -MP
    18: null,  // -TP
    19: null,  // -Strength
    20: "agility",  // % Return
    21: null,  // +Resistance
    22: "science",  // +Wisdom
    23: null,  // Cure poison
    24: null,  // -Magic
    25: null,  // Aftereffects
    26: null,  // % Vulnerability
    27: null,  // Absolute vulnerability
    28: null,  // % Life damage
    29: null,  // Give abs shields
    30: "science",  // Nova damage
    31: null,  // Give MP
    32: null,  // Give TP
    33: null,  // Poison→Science
    34: null,  // Damage→Shield
    35: null,  // Damage→Strength
    36: null,  // Nova→Magic
    38: null,  // +Strength (buff)
    39: null,  // +Magic
    40: null,  // +Science
    41: null,  // +Agility (buff)
    42: null,  // +Resistance (buff)
    43: null,  // Propagate
    44: null,  // +Wisdom (buff)
    45: "science",  // +Max life
    46: null,  // Attract
    47: null,  // -Agility
    48: null,  // -Wisdom
    49: null,  // Remove shackles
    50: null,  // MP per move
    51: null,  // Push
    53: null,  // Repel
    54: null,  // % Shield
    55: null,  // Agility per dead ally
    56: null,  // TP per kill
    57: null,  // Heal (fixed)
    58: null,  // Heal per crit
    59: null,  // Add state
};

function formatEffect(effect) {
    const fn = EFFECT_LABELS[effect.id];
    if (!fn) return `Effect #${effect.id}`;
    return fn(effect.value1, effect.value2);
}

function buildEffectLine(effect) {
    const text = formatEffect(effect);
    const stat = EFFECT_STATS[effect.id];
    const statIcon = stat
        ? `<img class="effect-stat-icon" src="public/image/charac/${stat}.png" alt="${stat}">`
        : '';
    return `<div class="chip-effect-line">${statIcon}<span class="chip-effect-text">${text}</span></div>`;
}

function buildEffectsHtml(effects) {
    return effects.map(e => buildEffectLine(e)).join('');
}

function buildEquippedChip(chip, index, overflow) {
    const overflowClass = overflow ? ' overflow' : '';
    return `<div class="chip-slot filled${overflowClass}" data-index="${index}">
        <div class="chip-icon">
            <img src="public/image/chip/${chip.name}.png" alt="${chip.name}">
        </div>
        <div class="chip-info">
            <span class="chip-name">${chip.name.replace(/_/g, ' ')}</span>
            <span class="chip-level">Lvl ${chip.level}</span>
            <div class="chip-effects">${buildEffectsHtml(chip.effects)}</div>
        </div>
    </div>`;
}

function renderEquippedChips(leek) {
    const list = document.querySelector('.equipped-chips-list');
    const totalRam = leek.getTotalStats().ram;
    const count = leek.chips.length;

    // Update counter
    const countEl = document.querySelector('.chips-count');
    const maxEl = document.querySelector('.chips-max');
    const counterEl = document.querySelector('.chips-counter');
    countEl.textContent = count;
    maxEl.textContent = totalRam;
    counterEl.classList.toggle('overflow', count > totalRam);

    if (count === 0) {
        list.innerHTML = '<div class="chip-slot empty"><span class="slot-placeholder">No chips equipped</span></div>';
        return;
    }
    list.innerHTML = leek.chips.map((chip, i) => buildEquippedChip(chip, i, i >= totalRam)).join('');
}

function buildChipCard(chip) {
    return `<div class="chip-card" data-id="${chip.id}" data-type="${chip.type}">
        <div class="chip-icon">
            <img src="public/image/chip/${chip.name}.png" alt="${chip.name}">
        </div>
        <div class="chip-info">
            <span class="chip-name">${chip.name.replace(/_/g, ' ')}</span>
            <span class="chip-level">Lvl ${chip.level}</span>
            <div class="chip-effects">${buildEffectsHtml(chip.effects)}</div>
        </div>
    </div>`;
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
    chipsList.innerHTML = chips.map(chip => buildChipCard(chip)).join('');
    updateEquippedState(leek);
}

export function initChipsTab(leek) {
    const equippedList = document.querySelector('.equipped-chips-list');
    const chipsList = document.querySelector('.chips-list');
    const sortToggle = document.querySelector('.chips-sort-toggle');

    const allChips = Object.values(CHIPS);
    let sortMode = 'type';

    // Initial render
    renderEquippedChips(leek);
    renderChipsList(chipsList, sortChips(allChips, sortMode), leek);

    // Sort toggle
    sortToggle.addEventListener('click', () => {
        sortMode = sortMode === 'level' ? 'type' : 'level';
        sortToggle.textContent = sortMode === 'level' ? 'Sort: Level' : 'Sort: Type';
        renderChipsList(chipsList, sortChips(allChips, sortMode), leek);
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
    leek.on('level', () => renderEquippedChips(leek));
    leek.on('stats', () => renderEquippedChips(leek));
    leek.on('components', () => renderEquippedChips(leek));
}
