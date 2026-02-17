import { WEAPONS } from '../data/weapons.js';

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
    60: () => 'Unknow',
    61: () => 'Steal removed life'
};

// Stat that boosts each effect (null = no stat boost)
const EFFECT_STATS = {
    1: "strength",   // Damage
    2: "wisdom",   // Heal
    3: "science",   // +Strength
    4: "science",   // +Agility
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
    17: "magic",  // -MP
    18: "magic",  // -TP
    19: "magic",  // -Strength
    20: "agility",  // % Return
    21: "science",  // +Resistance
    22: "science",  // +Wisdom
    23: null,  // Cure poison
    24: null,  // -Magic
    25: "science",  // Aftereffects
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
    47: "magic",  // -Agility
    48: "magic",  // -Wisdom
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
    return `<div class="weapon-effect-line">${statIcon}<span class="weapon-effect-text">${text}</span></div>`;
}

function buildEffectsHtml(effects) {
    return effects.map(e => buildEffectLine(e)).join('');
}

function buildWeaponMeta(weapon) {
    const uses = weapon.max_uses > 0 ? `${weapon.max_uses}/turn` : '';
    return `<div class="weapon-meta">
        <span class="weapon-cost"><img src="public/image/charac/tp.png" alt="TP">${weapon.cost} TP</span>
        ${uses ? `<span class="weapon-uses">${uses}</span>` : ''}
    </div>`;
}

function buildEquippedWeapon(weapon, index, maxWeapons) {
    const overflow = index >= maxWeapons ? ' overflow' : '';
    return `<div class="weapon-slot filled${overflow}" data-index="${index}">
        <span class="slot-number">${index + 1}</span>
        <div class="weapon-icon">
            <img src="public/image/weapon/${weapon.name}.png" alt="${weapon.name}">
        </div>
        <div class="weapon-info">
            <span class="weapon-name">${weapon.name.replace(/_/g, ' ')}</span>
            <span class="weapon-level">Lvl ${weapon.level}</span>
            ${buildWeaponMeta(weapon)}
            <div class="weapon-effects">${buildEffectsHtml(weapon.effects)}</div>
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

    // Update counter
    const countEl = document.querySelector('.weapons-count');
    const maxEl = document.querySelector('.weapons-max');
    const counterEl = document.querySelector('.weapons-counter');
    countEl.textContent = count;
    maxEl.textContent = maxWeapons;
    counterEl.classList.toggle('overflow', count > maxWeapons);

    let html = '';
    const slotCount = Math.max(maxWeapons, count);
    for (let i = 0; i < slotCount; i++) {
        if (i < count) {
            html += buildEquippedWeapon(leek.weapons[i], i, maxWeapons);
        } else {
            html += buildEmptyWeaponSlot(i);
        }
    }
    list.innerHTML = html;
}

function buildWeaponCard(weapon) {
    const effectIds = [...new Set(weapon.effects.map(e => e.id))].join(',');
    return `<div class="weapon-card" data-id="${weapon.id}" data-effects="${effectIds}" data-level="${weapon.level}">
        <div class="weapon-icon">
            <img src="public/image/weapon/${weapon.name}.png" alt="${weapon.name}">
        </div>
        <div class="weapon-info">
            <span class="weapon-name">${weapon.name.replace(/_/g, ' ')}</span>
            <span class="weapon-level">Lvl ${weapon.level}</span>
            ${buildWeaponMeta(weapon)}
            <div class="weapon-effects">${buildEffectsHtml(weapon.effects)}</div>
        </div>
    </div>`;
}

function applyLevelFilter(leekLevel, showAll) {
    document.querySelectorAll('.weapon-card').forEach(card => {
        const weaponLevel = parseInt(card.dataset.level, 10);
        card.classList.toggle('over-level', !showAll && weaponLevel > leekLevel);
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
    weaponsList.innerHTML = weapons.map(weapon => buildWeaponCard(weapon)).join('');
    updateEquippedState(leek);
}

export function initWeaponsTab(leek) {
    const equippedList = document.querySelector('.equipped-weapons-list');
    const weaponsList = document.querySelector('.weapons-list');
    const sortToggle = document.querySelector('.weapons-sort-toggle');
    const filtersContainer = document.querySelector('.weapons-filters');
    const showAllToggle = document.querySelector('.weapons-show-all-toggle');

    const allWeapons = Object.values(WEAPONS);
    let sortMode = 'level';
    let activeEffects = [];
    let showAll = false;

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
}
