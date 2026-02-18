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
    32: 'tp',           // +TP (flat)
};

/**
 * Compute critical hit multiplier based on settings and agility.
 * critChance = min(agility / 1000, 1). Crit boosts values by 30%.
 * 'never' → 1.0, 'always' → 1.3, 'average' → 1 + 0.3 * critChance
 */
function getCritMultiplier(agility, forceCrit) {
    if (forceCrit) return 1.3;
    if (settings.critMode === 'never') return 1;
    if (settings.critMode === 'always') return 1.3;
    const critChance = Math.min((agility || 0) / 1000, 1);
    return 1 + 0.3 * critChance;
}

/**
 * Compute a single effect's min/max values using running stats.
 * Returns { v1, v2 } where the result range is [v1, v1+v2].
 */
function computeEffect(effect, runningStats, critMult) {
    const stat = EFFECT_STATS[effect.id];
    if (!stat) {
        const v1 = Math.round(effect.value1 * critMult);
        const v2 = effect.value2 ? Math.round((effect.value1 + effect.value2) * critMult) - v1 : 0;
        return { v1, v2 };
    }
    const multiplier = (1 + (runningStats[stat] || 0) / 100) * critMult;
    const v1 = Math.round(effect.value1 * multiplier);
    const v2 = effect.value2 ? Math.round((effect.value1 + effect.value2) * multiplier) - v1 : 0;
    return { v1, v2 };
}

/**
 * Simulate the combo across multiple turns.
 * Returns an array of turn results: { tpUsed, steps: [{ item, effects, boosted }] }
 * Buffs carry across turns based on their `turns` duration.
 */
/**
 * Build a unique key for an item (chip vs weapon may share IDs).
 */
function itemKey(item) {
    return `${getItemType(item)}_${item.id}`;
}

/**
 * Compute cooldown state at the start of a given turn.
 * Returns a Map<itemKey, turnsLeft> for items still on cooldown.
 */
function computeCooldowns(comboTurns, upToTurn) {
    // cooldownReady[key] = next turn index where the item can be cast again
    const cooldownReady = {};
    for (let t = 0; t < upToTurn; t++) {
        for (const item of comboTurns[t]) {
            const cd = item.cooldown || 0;
            if (cd > 0) {
                const key = itemKey(item);
                cooldownReady[key] = t + cd + 1; // available again at this turn index
            }
        }
    }
    const result = new Map();
    for (const [key, readyAt] of Object.entries(cooldownReady)) {
        if (readyAt > upToTurn) {
            result.set(key, readyAt - upToTurn);
        }
    }
    return result;
}

function simulateCombo(comboTurns, comboCrits, baseStats) {
    const activeBuffs = []; // { stat, value, turnsRemaining }
    const turnResults = [];
    // cooldownReady[key] = next turn index where the item can be cast again
    const cooldownReady = {};

    for (let t = 0; t < comboTurns.length; t++) {
        const turn = comboTurns[t];
        const turnCrits = comboCrits[t] || [];

        // Build running stats = base + active buffs
        const running = { ...baseStats };
        for (const buff of activeBuffs) {
            running[buff.stat] = (running[buff.stat] || 0) + buff.value;
        }

        const steps = [];
        let tpUsed = 0;
        const BOOSTED_STATS = new Set(['strength', 'agility', 'magic']);
        let hasDamageBuff = activeBuffs.some(b => BOOSTED_STATS.has(b.stat));

        for (let idx = 0; idx < turn.length; idx++) {
            const item = turn[idx];
            const forceCrit = turnCrits[idx] || false;
            const critMult = getCritMultiplier(running.agility, forceCrit);
            const computed = [];
            for (const effect of item.effects) {
                const { v1, v2 } = computeEffect(effect, running, critMult);
                computed.push({ id: effect.id, v1, v2 });
            }

            // Check cooldown
            const key = itemKey(item);
            const readyAt = cooldownReady[key] || 0;
            const onCooldown = t < readyAt;
            const cooldownLeft = onCooldown ? readyAt - t : 0;

            steps.push({ item, effects: computed, boosted: hasDamageBuff, onCooldown, cooldownLeft, forceCrit });
            tpUsed += item.cost || 0;

            // Register cooldown for this cast
            const cd = item.cooldown || 0;
            if (cd > 0) {
                cooldownReady[key] = t + cd + 1;
            }

            // Apply buff effects to running stats for subsequent items in this turn
            for (let i = 0; i < computed.length; i++) {
                const ce = computed[i];
                const buffStat = BUFF_STAT_MAP[ce.id];
                if (buffStat) {
                    running[buffStat] = (running[buffStat] || 0) + ce.v1;
                    if (BOOSTED_STATS.has(buffStat)) hasDamageBuff = true;

                    // Also register for cross-turn carry if turns > 0
                    const effectDef = item.effects[i];
                    if (effectDef && effectDef.turns > 0) {
                        activeBuffs.push({
                            stat: buffStat,
                            value: ce.v1,
                            turnsRemaining: effectDef.turns
                        });
                    }
                }
            }
        }

        turnResults.push({ tpUsed, tpTotal: running.tp || 0, steps });

        // End of turn: decrement buff durations, remove expired
        for (let i = activeBuffs.length - 1; i >= 0; i--) {
            activeBuffs[i].turnsRemaining--;
            if (activeBuffs[i].turnsRemaining <= 0) {
                activeBuffs.splice(i, 1);
            }
        }
    }

    return turnResults;
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

function countInTurn(turn, item) {
    return turn.filter(c => c.id === item.id && getItemType(c) === getItemType(item)).length;
}

function buildPickerItem(item, currentTurn, totalStats, cooldownMap) {
    const type = getItemType(item);
    const used = countInTurn(currentTurn, item);
    const max = getMaxUses(item);
    const atMax = used >= max;
    const cdLeft = cooldownMap.get(itemKey(item)) || 0;
    const onCooldown = cdLeft > 0;
    const disabled = atMax || onCooldown;
    const iconClass = type === 'weapon' ? 'combo-picker-icon weapon' : 'combo-picker-icon chip';

    const cdLabel = onCooldown ? `<span class="combo-picker-cooldown">CD ${cdLeft}</span>` : '';

    const critMult = getCritMultiplier(totalStats.agility);
    const effects = item.effects.map(e => {
        const { v1, v2 } = computeEffect(e, totalStats, critMult);
        return buildSimEffectLine({ id: e.id, v1, v2 });
    }).join('');

    return `<div class="combo-picker-item${disabled ? ' disabled' : ''}" data-id="${item.id}" data-item-type="${type}">
        <div class="${iconClass}">
            <img src="${getItemIcon(item)}" alt="${item.name}">
        </div>
        <div class="combo-picker-info">
            <span class="combo-picker-name">${item.name.replace(/_/g, ' ')}</span>
            <span class="combo-picker-meta">
                <img src="public/image/charac/tp.png" alt="TP">${item.cost} TP
                <span class="combo-picker-uses">${used}/${max}</span>
                ${cdLabel}
            </span>
            <div class="combo-picker-effects">${effects}</div>
        </div>
    </div>`;
}

function buildComboEntry(step, index, total, turnIndex) {
    const { item, effects, boosted, onCooldown, cooldownLeft, forceCrit } = step;
    const type = getItemType(item);
    const iconClass = type === 'weapon' ? 'combo-entry-icon weapon' : 'combo-entry-icon chip';
    const effectsHtml = effects.map(ce => buildSimEffectLine(ce)).join('');
    const isFirst = index === 0;
    const isLast = index === total - 1;
    const classes = [
        'combo-entry',
        boosted ? 'boosted' : '',
        onCooldown ? 'on-cooldown' : '',
        forceCrit ? 'force-crit' : '',
    ].filter(Boolean).join(' ');
    const cooldownBadge = onCooldown
        ? `<span class="combo-entry-cooldown" title="On cooldown for ${cooldownLeft} more turn${cooldownLeft > 1 ? 's' : ''}">CD ${cooldownLeft}</span>`
        : '';

    return `<div class="${classes}" data-turn="${turnIndex}" data-index="${index}">
        <button class="combo-entry-remove" title="Remove">&times;</button>
        <button class="combo-entry-crit${forceCrit ? ' active' : ''}" title="Toggle forced crit">Crit</button>
        <div class="${iconClass}">
            <img src="${getItemIcon(item)}" alt="${item.name}">
        </div>
        <div class="combo-entry-info">
            <span class="combo-entry-name">${item.name.replace(/_/g, ' ')}</span>
            <span class="combo-entry-cost"><img src="public/image/charac/tp.png" alt="TP">${item.cost} TP${cooldownBadge}</span>
            <div class="combo-entry-effects">${effectsHtml}</div>
        </div>
        <div class="combo-entry-order">
            <button class="combo-entry-up${isFirst ? ' hidden' : ''}" title="Move left">&#9664;</button>
            <span class="combo-entry-number">${index + 1}</span>
            <button class="combo-entry-down${isLast ? ' hidden' : ''}" title="Move right">&#9654;</button>
        </div>
    </div>`;
}

function aggregateSimulated(allSteps) {
    const groups = {};
    for (const step of allSteps) {
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
    const currentTurn = leek.combo[leek.selectedTurn] || [];
    const cooldownMap = computeCooldowns(leek.combo, leek.selectedTurn);

    if (items.length === 0) {
        pickerList.innerHTML = '<p class="combo-empty">Equip weapons or chips first.</p>';
        return;
    }

    pickerList.innerHTML = items.map(item => buildPickerItem(item, currentTurn, totalStats, cooldownMap)).join('');
}

function renderTurns(leek, turnResults) {
    const container = document.querySelector('.combo-turns-container');
    const canRemoveTurn = leek.combo.length > 1;

    let html = '';

    for (let t = 0; t < leek.combo.length; t++) {
        const result = turnResults[t] || { tpUsed: 0, tpTotal: 0, steps: [] };
        const isSelected = t === leek.selectedTurn;
        const overflow = result.tpUsed > result.tpTotal;

        const removeBtn = canRemoveTurn
            ? `<button class="combo-turn-remove" data-turn="${t}" title="Remove turn">&times;</button>`
            : '';

        const entriesHtml = result.steps.length > 0
            ? result.steps.map((step, i) => buildComboEntry(step, i, result.steps.length, t)).join('')
            : '<p class="combo-empty">Click items to add to this turn.</p>';

        html += `<div class="combo-turn${isSelected ? ' selected' : ''}" data-turn="${t}">
            <div class="combo-turn-header">
                <span class="combo-turn-label">Turn ${t + 1}</span>
                <span class="combo-turn-tp${overflow ? ' overflow' : ''}">
                    <img src="public/image/charac/tp.png" alt="TP">
                    ${result.tpUsed} / ${result.tpTotal} TP
                </span>
                ${removeBtn}
            </div>
            <div class="combo-turn-items">${entriesHtml}</div>
        </div>`;
    }

    html += `<button class="combo-add-turn-btn">+ Add Turn</button>`;

    container.innerHTML = html;
}

function renderSummary(turnResults) {
    const summaryList = document.querySelector('.combo-summary-list');
    const allSteps = turnResults.flatMap(tr => tr.steps);

    if (allSteps.length === 0) {
        summaryList.innerHTML = '';
        return;
    }

    const groups = aggregateSimulated(allSteps);
    summaryList.innerHTML = groups.map(g => buildSummaryLine(g)).join('');
}

const CRIT_MODES = ['never', 'average', 'always'];
const CRIT_LABELS = { never: 'Crit: Off', average: 'Crit: Avg', always: 'Crit: On' };
const CRIT_TOOLTIPS = {
    never: 'No critical hits — base damage only',
    average: 'Average damage based on crit chance (agility / 1000, capped at 100%)',
    always: 'All attacks critically hit (+30% damage)',
};

export function initComboTab(leek) {
    const container = document.querySelector('.combo-turns-container');
    const pickerList = document.querySelector('.combo-picker-list');
    const clearBtn = document.querySelector('.combo-clear-btn');
    const critToggle = document.querySelector('.combo-crit-toggle');

    // Crit toggle: cycles never → average → always → never
    critToggle.addEventListener('click', () => {
        const idx = CRIT_MODES.indexOf(settings.critMode);
        settings.critMode = CRIT_MODES[(idx + 1) % CRIT_MODES.length];
        critToggle.textContent = CRIT_LABELS[settings.critMode];
        critToggle.title = CRIT_TOOLTIPS[settings.critMode];
        critToggle.dataset.mode = settings.critMode;
        refresh();
    });

    function refresh() {
        const baseStats = flattenStats(leek.getTotalStats());
        const turnResults = simulateCombo(leek.combo, leek.comboCrits, baseStats);
        renderTurns(leek, turnResults);
        renderSummary(turnResults);
        renderPicker(leek);
    }

    refresh();

    // Add item to combo (goes to selected turn)
    pickerList.addEventListener('click', (e) => {
        const el = e.target.closest('.combo-picker-item');
        if (!el || el.classList.contains('disabled')) return;
        const id = el.dataset.id;
        const type = el.dataset.itemType;
        const items = getEquippedItems(leek);
        const item = items.find(i => String(i.id) === id && getItemType(i) === type);
        if (item) leek.addComboItem(item);
    });

    // Turn selection, entry actions, add/remove turn
    container.addEventListener('click', (e) => {
        // Add turn button
        if (e.target.closest('.combo-add-turn-btn')) {
            leek.addTurn();
            return;
        }

        // Remove turn button
        const removeTurnBtn = e.target.closest('.combo-turn-remove');
        if (removeTurnBtn) {
            const turnIndex = parseInt(removeTurnBtn.dataset.turn, 10);
            leek.removeTurn(turnIndex);
            return;
        }

        // Entry actions (remove, up, down)
        const entry = e.target.closest('.combo-entry');
        if (entry) {
            const turnIndex = parseInt(entry.dataset.turn, 10);
            const index = parseInt(entry.dataset.index, 10);

            if (e.target.closest('.combo-entry-remove')) {
                leek.removeComboItem(turnIndex, index);
                return;
            } else if (e.target.closest('.combo-entry-crit')) {
                leek.toggleComboCrit(turnIndex, index);
                return;
            } else if (e.target.closest('.combo-entry-up')) {
                leek.moveComboItem(turnIndex, index, index - 1);
                return;
            } else if (e.target.closest('.combo-entry-down')) {
                leek.moveComboItem(turnIndex, index, index + 1);
                return;
            }
        }

        // Turn selection (click on turn container itself)
        const turnEl = e.target.closest('.combo-turn');
        if (turnEl) {
            const turnIndex = parseInt(turnEl.dataset.turn, 10);
            leek.selectTurn(turnIndex);
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
