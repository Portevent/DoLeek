import { EFFECT_LABELS, EFFECT_STATS } from '../data/effects.js';
import { settings } from '../model/settings.js';

// Buff effect id → stat they increase on the caster's side
const BUFF_STAT_MAP = {
    3: 'strength',      // +strength (boosted by science)
    4: 'agility',       // +agility (boosted by science)
    7: 'mp',            // +MP (boosted by science)
    8: 'tp',            // +TP (boosted by science)
    12: 'life',         // +max HP (boosted by wisdom)
    21: 'resistance',   // +resistance (boosted by science)
    22: 'wisdom',       // +wisdom (boosted by science)
    38: 'strength',     // +strength (buff, flat)
    39: 'magic',        // +magic (buff, flat)
    40: 'science',      // +science (buff, flat)
    41: 'agility',      // +agility (buff, flat)
    42: 'resistance',   // +resistance (buff, flat)
    44: 'wisdom',       // +wisdom (buff, flat)
    45: 'life',         // +max life (boosted by science)
};

/**
 * Compute a single effect's min/max values using running stats.
 * Returns { v1, v2 } where the result range is [v1, v1+v2].
 */
function computeEffect(effect, runningStats) {
    const stat = EFFECT_STATS[effect.id];
    if (!stat) return { v1: effect.value1, v2: effect.value2 };
    const multiplier = 1 + (runningStats[stat] || 0) / 100;
    const v1 = Math.round(effect.value1 * multiplier);
    const v2 = effect.value2 ? Math.round((effect.value1 + effect.value2) * multiplier) - v1 : 0;
    return { v1, v2 };
}

/**
 * Simulate the combo sequentially.
 * Returns an array of steps, one per combo item:
 *   { item, effects: [{ id, v1, v2 }], boosted }
 * `boosted` is true if this step benefits from a prior buff.
 */
function simulateCombo(combo, baseStats) {
    const running = { ...baseStats };
    const steps = [];
    let hasBuff = false;

    for (const item of combo) {
        const computed = [];
        for (const effect of item.effects) {
            const { v1, v2 } = computeEffect(effect, running);
            computed.push({ id: effect.id, v1, v2 });
        }

        steps.push({ item, effects: computed, boosted: hasBuff });

        // Apply buff effects to running stats for subsequent steps
        for (const ce of computed) {
            const buffStat = BUFF_STAT_MAP[ce.id];
            if (buffStat) {
                running[buffStat] = (running[buffStat] || 0) + ce.v1;
                hasBuff = true;
            }
        }
    }

    return steps;
}

function formatSimEffect(id, v1, v2) {
    const fn = EFFECT_LABELS[id];
    if (!fn) return `Effect #${id}`;
    return fn(v1, v2);
}

function buildSimEffectLine(ce) {
    const text = formatSimEffect(ce.id, ce.v1, ce.v2);
    const stat = EFFECT_STATS[ce.id];
    const statIcon = stat
        ? `<img class="effect-stat-icon" src="public/image/charac/${stat}.png" alt="${stat}">`
        : '';
    const isBuff = BUFF_STAT_MAP[ce.id] !== undefined;
    return `<div class="combo-effect-line${isBuff ? ' buff' : ''}">${statIcon}<span>${text}</span></div>`;
}

function getMaxUses(item) {
    if (item.max_uses > 0) return item.max_uses;
    if (item.cooldown > 0) return 1;
    return 1;
}

function getItemType(item) {
    return item.item !== undefined ? 'weapon' : 'chip';
}

function getItemIcon(item) {
    const type = getItemType(item);
    return `public/image/${type}/${item.name}.png`;
}

function countInCombo(combo, item) {
    return combo.filter(c => c.id === item.id && getItemType(c) === getItemType(item)).length;
}

function buildPickerItem(item, combo, totalStats) {
    const type = getItemType(item);
    const used = countInCombo(combo, item);
    const max = getMaxUses(item);
    const atMax = used >= max;
    const iconClass = type === 'weapon' ? 'combo-picker-icon weapon' : 'combo-picker-icon chip';

    const effects = item.effects.map(e => {
        const { v1, v2 } = computeEffect(e, totalStats);
        return buildSimEffectLine({ id: e.id, v1, v2 });
    }).join('');

    return `<div class="combo-picker-item${atMax ? ' disabled' : ''}" data-id="${item.id}" data-item-type="${type}">
        <div class="${iconClass}">
            <img src="${getItemIcon(item)}" alt="${item.name}">
        </div>
        <div class="combo-picker-info">
            <span class="combo-picker-name">${item.name.replace(/_/g, ' ')}</span>
            <span class="combo-picker-meta">
                <img src="public/image/charac/tp.png" alt="TP">${item.cost} TP
                <span class="combo-picker-uses">${used}/${max}</span>
            </span>
            <div class="combo-picker-effects">${effects}</div>
        </div>
    </div>`;
}

function buildComboEntry(step, index, total) {
    const { item, effects, boosted } = step;
    const type = getItemType(item);
    const iconClass = type === 'weapon' ? 'combo-entry-icon weapon' : 'combo-entry-icon chip';
    const effectsHtml = effects.map(ce => buildSimEffectLine(ce)).join('');
    const isFirst = index === 0;
    const isLast = index === total - 1;
    const boostedClass = boosted ? ' boosted' : '';

    return `<div class="combo-entry${boostedClass}" data-index="${index}">
        <div class="combo-entry-order">
            <button class="combo-entry-up${isFirst ? ' hidden' : ''}" title="Move up">&#9650;</button>
            <span class="combo-entry-number">${index + 1}</span>
            <button class="combo-entry-down${isLast ? ' hidden' : ''}" title="Move down">&#9660;</button>
        </div>
        <div class="${iconClass}">
            <img src="${getItemIcon(item)}" alt="${item.name}">
        </div>
        <div class="combo-entry-info">
            <span class="combo-entry-name">${item.name.replace(/_/g, ' ')}</span>
            <span class="combo-entry-cost"><img src="public/image/charac/tp.png" alt="TP">${item.cost} TP</span>
            <div class="combo-entry-effects">${effectsHtml}</div>
        </div>
        <button class="combo-entry-remove" title="Remove">&times;</button>
    </div>`;
}

function aggregateSimulated(steps) {
    const groups = {};
    for (const step of steps) {
        for (const ce of step.effects) {
            if (!groups[ce.id]) {
                groups[ce.id] = { id: ce.id, value1: 0, value2: 0, count: 0 };
            }
            const g = groups[ce.id];
            g.value1 += ce.v1;
            g.value2 += ce.v2;
            g.count++;
        }
    }
    return Object.values(groups);
}

function buildSummaryLine(group) {
    const text = formatSimEffect(group.id, group.value1, group.value2);
    const stat = EFFECT_STATS[group.id];
    const statIcon = stat
        ? `<img class="effect-stat-icon" src="public/image/charac/${stat}.png" alt="${stat}">`
        : '';
    return `<div class="combo-summary-line">
        ${statIcon}<span class="combo-summary-text">${text}</span>
        <span class="combo-summary-count">&times;${group.count}</span>
    </div>`;
}

function getEquippedItems(leek) {
    const items = [];
    for (const weapon of leek.weapons) items.push(weapon);
    for (const chip of leek.chips) items.push(chip);
    return items;
}

function flattenStats(statsObj) {
    return {
        life: statsObj.life || 0,
        strength: statsObj.strength || 0,
        wisdom: statsObj.wisdom || 0,
        resistance: statsObj.resistance || 0,
        agility: statsObj.agility || 0,
        science: statsObj.science || 0,
        magic: statsObj.magic || 0,
        frequency: statsObj.frequency || 0,
        cores: statsObj.cores || 0,
        ram: statsObj.ram || 0,
        tp: statsObj.tp || 0,
        mp: statsObj.mp || 0,
    };
}

function renderPicker(leek) {
    const pickerList = document.querySelector('.combo-picker-list');
    const items = getEquippedItems(leek);
    const totalStats = flattenStats(leek.getTotalStats());

    if (items.length === 0) {
        pickerList.innerHTML = '<p class="combo-empty">Equip weapons or chips first.</p>';
        return;
    }

    pickerList.innerHTML = items.map(item => buildPickerItem(item, leek.combo, totalStats)).join('');
}

function renderComboList(leek, steps) {
    const comboList = document.querySelector('.combo-list');
    const totalStats = leek.getTotalStats();
    const tpUsed = document.querySelector('.combo-tp-used');
    const tpTotal = document.querySelector('.combo-tp-total');

    tpTotal.textContent = totalStats.tp;
    tpUsed.textContent = leek.comboStats.tp;

    const counter = document.querySelector('.combo-tp-counter');
    counter.classList.toggle('overflow', leek.comboStats.tp > totalStats.tp);

    if (steps.length === 0) {
        comboList.innerHTML = '<p class="combo-empty">Click items to build a combo.</p>';
        return;
    }

    const total = steps.length;
    comboList.innerHTML = steps.map((step, i) => buildComboEntry(step, i, total)).join('');
}

function renderSummary(steps) {
    const summaryList = document.querySelector('.combo-summary-list');

    if (steps.length === 0) {
        summaryList.innerHTML = '';
        return;
    }

    const groups = aggregateSimulated(steps);
    summaryList.innerHTML = groups.map(g => buildSummaryLine(g)).join('');
}

export function initComboTab(leek) {
    const comboList = document.querySelector('.combo-list');
    const pickerList = document.querySelector('.combo-picker-list');
    const clearBtn = document.querySelector('.combo-clear-btn');

    function refresh() {
        const baseStats = flattenStats(leek.getTotalStats());
        const steps = simulateCombo(leek.combo, baseStats);
        renderComboList(leek, steps);
        renderSummary(steps);
        renderPicker(leek);
    }

    refresh();

    // Add item to combo
    pickerList.addEventListener('click', (e) => {
        const el = e.target.closest('.combo-picker-item');
        if (!el || el.classList.contains('disabled')) return;
        const id = el.dataset.id;
        const type = el.dataset.itemType;
        const items = getEquippedItems(leek);
        const item = items.find(i => String(i.id) === id && getItemType(i) === type);
        if (item) leek.addComboItem(item);
    });

    // Remove or reorder items in combo
    comboList.addEventListener('click', (e) => {
        const entry = e.target.closest('.combo-entry');
        if (!entry) return;
        const index = parseInt(entry.dataset.index, 10);

        if (e.target.closest('.combo-entry-remove')) {
            leek.removeComboItem(index);
        } else if (e.target.closest('.combo-entry-up')) {
            leek.moveComboItem(index, index - 1);
        } else if (e.target.closest('.combo-entry-down')) {
            leek.moveComboItem(index, index + 1);
        }
    });

    // Clear combo
    clearBtn.addEventListener('click', () => leek.clearCombo());

    // Re-render on changes
    leek.on('combo', refresh);
    leek.on('chips', refresh);
    leek.on('weapons', refresh);
    leek.on('stats', refresh);
    leek.on('components', refresh);
    leek.on('level', refresh);
    leek.on('computed', refresh);
}
