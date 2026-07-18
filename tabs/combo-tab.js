import { EFFECT_LABELS, EFFECT_STATS } from '../data/effects.js';
import { TARGET_SELF, TARGET_ENEMY, getDefaultTarget } from '../data/targets.js';
import { settings } from '../model/settings.js';
import { t } from '../model/i18n.js';

// Editable target stats shown in the combo target panel.
// key → { label i18n key, icon in public/image/charac }
// Shields accept negative values: they then act as a vulnerability.
const TARGET_FIELDS = [
    { key: 'life', labelKey: 'target_hp', icon: 'life' },
    { key: 'tp', labelKey: 'target_tp', icon: 'tp' },
    { key: 'mp', labelKey: 'target_mp', icon: 'mp' },
    { key: 'absShield', labelKey: 'target_abs_shield', icon: 'resistance', allowNegative: true },
    { key: 'relShield', labelKey: 'target_rel_shield', icon: 'resistance', allowNegative: true },
];

function allowsNegative(key) {
    return TARGET_FIELDS.find(f => f.key === key)?.allowNegative === true;
}

/**
 * Damage actually dealt to the target after its shields:
 * relative shield reduces by a percentage, then absolute shield subtracts a flat amount.
 * A negative shield (vulnerability) increases the damage taken.
 */
function damageThroughShields(dmg, ts) {
    const afterRel = dmg * (1 - ts.relShield / 100);
    return Math.max(0, Math.round(afterRel) - ts.absShield);
}

// Effect modifier bitfield: bit 4 means the effect lands on the caster whatever
// the item is aimed at (so modifiers 4 and 5 both carry it).
const MODIFIER_ON_CASTER = 4;
// Bit 2: the effect is multiplied by the number of entities hit (Plasma)
const MODIFIER_MULTIPLIED_BY_TARGETS = 2;

function affectsCaster(effectDef) {
    return ((effectDef?.modifiers || 0) & MODIFIER_ON_CASTER) !== 0;
}

function isMultipliedByTargets(effectDef) {
    return ((effectDef?.modifiers || 0) & MODIFIER_MULTIPLIED_BY_TARGETS) !== 0;
}

// Whether the item has any effect worth setting a multiplier on
function hasMultipliedEffect(item) {
    return item.effects.some(isMultipliedByTargets);
}

// Target bitfield: which entity types an effect is allowed to affect.
// The combo only models two entities — the leek (caster) and one enemy — so
// allies (a third side) are not represented: an allies-only buff never lands
// on the caster. Effects default to "everyone" when the flag is absent.
const EFFECT_TARGET_ENEMIES = 1;
const EFFECT_TARGET_CASTER = 4;

function effectTargets(effectDef) {
    return effectDef?.targets ?? 31;
}

function canHitEnemy(effectDef) {
    return (effectTargets(effectDef) & EFFECT_TARGET_ENEMIES) !== 0;
}

function canHitCaster(effectDef) {
    return (effectTargets(effectDef) & EFFECT_TARGET_CASTER) !== 0;
}

/**
 * Decide which side an effect lands on given the item's aim, its on-caster
 * modifier and its target flags. Returns 'enemy', 'caster' or 'none' — 'none'
 * meaning the effect cannot touch either modelled entity and so must not apply.
 *
 * Only the "affect launcher" modifier folds an effect back onto the leek when
 * the item is aimed at the enemy; an ally/self boost without it does nothing to
 * the caster in that case.
 */
function resolveRecipient(effectDef, itemAim) {
    if (affectsCaster(effectDef)) return 'caster';
    if (itemAim === TARGET_ENEMY) {
        return canHitEnemy(effectDef) ? 'enemy' : 'none';
    }
    // Aimed at the caster: only effects allowed on the caster itself land.
    return canHitCaster(effectDef) ? 'caster' : 'none';
}

// Effects whose value is reduced by the target's shields
const SHIELDED_EFFECTS = new Set([1, 30]); // damage, nova damage

/**
 * Record on a computed effect the damage range that survives the target's
 * current shields, as dv1/dv2 (range [dv1, dv1+dv2]). Left undefined for
 * effects shields do not apply to (poison, buffs, shackles...).
 */
function storeShieldedDamage(ce, ts) {
    if (!SHIELDED_EFFECTS.has(ce.id)) return;
    ce.dv1 = damageThroughShields(ce.v1, ts);
    ce.dv2 = ce.v2 ? damageThroughShields(ce.v1 + ce.v2, ts) - ce.dv1 : 0;
}

/**
 * Apply one computed effect to the enemy target state.
 * `poisons` collects damage-over-time to apply at the end of each turn.
 */
function applyEffectToTarget(ce, effectDef, ts, poisons) {
    const mid = ce.v1 + Math.round(ce.v2 / 2); // expected value of the effect range
    switch (ce.id) {
        case 1: case 30: // damage / nova damage
            ts.life = Math.max(0, ts.life - damageThroughShields(mid, ts));
            break;
        case 13: // poison (damage over time, bypasses shields)
            poisons.push({ damage: mid, turnsRemaining: effectDef.turns || 1 });
            break;
        case 2: case 57: // heal
            ts.life = Math.min(ts.maxLife, ts.life + mid);
            break;
        case 6: // absolute shield
            ts.absShield += mid; break;
        case 5: case 54: // relative shield
            ts.relShield += mid; break;
        case 26: // % vulnerability (lowers relative shield)
            ts.relShield -= mid; break;
        case 27: // absolute vulnerability (lowers absolute shield)
            ts.absShield -= mid; break;
        case 7: case 31: // +MP
            ts.mp += mid; break;
        case 8: case 32: // +TP
            ts.tp += mid; break;
        case 17: // -MP
            ts.mp -= mid; break;
        case 18: // -TP
            ts.tp -= mid; break;
        case 12: case 45: // +max HP
            ts.maxLife += mid; ts.life += mid; break;
    }
}

/**
 * Apply pending poison ticks to the target at the end of a turn.
 */
function applyPoisonTicks(ts, poisons) {
    for (let i = poisons.length - 1; i >= 0; i--) {
        ts.life = Math.max(0, ts.life - poisons[i].damage);
        poisons[i].turnsRemaining--;
        if (poisons[i].turnsRemaining <= 0) poisons.splice(i, 1);
    }
}

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
 * `mult` multiplies effects flagged as multiplied by the number of targets hit;
 * it applies after the stat bonus, on the rounded value, as the game does.
 */
function computeEffect(effect, runningStats, critMult, mult = 1) {
    const targetMult = isMultipliedByTargets(effect) ? mult : 1;
    const stat = EFFECT_STATS[effect.id];
    if (!stat) {
        const v1 = Math.round(effect.value1 * critMult);
        const v2 = effect.value2 ? Math.round((effect.value1 + effect.value2) * critMult) - v1 : 0;
        return { v1: v1 * targetMult, v2: v2 * targetMult };
    }
    const multiplier = (1 + (runningStats[stat] || 0) / 100) * critMult;
    const v1 = Math.round(effect.value1 * multiplier);
    const v2 = effect.value2 ? Math.round((effect.value1 + effect.value2) * multiplier) - v1 : 0;
    return { v1: v1 * targetMult, v2: v2 * targetMult };
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
            if (cd === -1) {
                const key = itemKey(item);
                cooldownReady[key] = 999; // infinite cooldown
            }else if (cd > 0) {
                const key = itemKey(item);
                cooldownReady[key] = t + cd; // available again at this turn index
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

function simulateCombo(comboTurns, comboCrits, comboTargets, comboMults, baseStats, targetStats) {
    const activeBuffs = []; // { stat, value, turnsRemaining }
    const turnResults = [];
    // cooldownReady[key] = next turn index where the item can be cast again
    const cooldownReady = {};

    // Enemy target state, persisting across turns.
    const targetState = {
        life: targetStats.life,
        maxLife: targetStats.life,
        tp: targetStats.tp,
        mp: targetStats.mp,
        absShield: targetStats.absShield,
        relShield: targetStats.relShield,
    };
    const targetPoisons = []; // { damage, turnsRemaining }

    for (let t = 0; t < comboTurns.length; t++) {
        const turn = comboTurns[t];
        const turnCrits = comboCrits[t] || [];
        const turnTargets = comboTargets[t] || [];
        const turnMults = comboMults[t] || [];

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
            const target = turnTargets[idx] || TARGET_SELF;
            const mult = turnMults[idx] || 1;
            const critMult = getCritMultiplier(running.agility, forceCrit);
            const computed = [];
            for (const effect of item.effects) {
                const { v1, v2 } = computeEffect(effect, running, critMult, mult);
                computed.push({ id: effect.id, v1, v2 });
            }

            // Check cooldown
            const key = itemKey(item);
            const readyAt = cooldownReady[key] || 0;
            const onCooldown = t < readyAt;
            const cooldownLeft = onCooldown ? readyAt - t : 0;

            steps.push({ item, effects: computed, boosted: hasDamageBuff, onCooldown, cooldownLeft, forceCrit, target, mult });
            tpUsed += item.cost || 0;

            // Register cooldown for this cast
            const cd = item.cooldown || 0;
            if (cd > 0) {
                cooldownReady[key] = t + cd;
            }
            if (cd === -1) {
                cooldownReady[key] = 999;
            }

            // Each effect is routed on its own: an item aimed at the enemy still
            // applies its on-caster effects to the leek, and its target flags
            // decide whether it may land on the enemy, the caster, or nobody.
            for (let i = 0; i < computed.length; i++) {
                const ce = computed[i];
                const effectDef = item.effects[i];
                const recipient = resolveRecipient(effectDef, target);
                ce.onCaster = recipient === 'caster';
                ce.applies = recipient !== 'none';

                // Effect that cannot legally touch either entity: skip it.
                if (!ce.applies) continue;

                if (recipient === 'enemy') {
                    // Shields are read before the effect lands, so a shield cast
                    // earlier in the combo is already reflected here.
                    storeShieldedDamage(ce, targetState);
                    applyEffectToTarget(ce, effectDef, targetState, targetPoisons);
                    continue;
                }

                // Buff effects raise running stats for the next items of this turn
                const buffStat = BUFF_STAT_MAP[ce.id];
                if (buffStat) {
                    running[buffStat] = (running[buffStat] || 0) + ce.v1;
                    if (BOOSTED_STATS.has(buffStat)) hasDamageBuff = true;

                    // Also register for cross-turn carry if turns > 0
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

        // End of turn: apply poison damage-over-time to the target.
        applyPoisonTicks(targetState, targetPoisons);

        turnResults.push({ tpUsed, tpTotal: running.tp || 0, steps, target: { ...targetState } });

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

function round1(x) {
    return Math.round(x * 10) / 10;
}

/**
 * Format an effect, optionally divided by a TP cost.
 * Labels rebuild the top of the range as v1 + v2, which reintroduces float
 * noise (4.2 + 3.3 → 7.500000000000001), so long decimals are trimmed back.
 */
function formatSimEffect(id, v1, v2, divisor = 1) {
    const fn = EFFECT_LABELS[id];
    if (!fn) return `Effect #${id}`;
    if (divisor === 1) return fn(v1, v2);
    const low = round1(v1 / divisor);
    const high = round1((v1 + v2) / divisor);
    return fn(low, round1(high - low)).replace(/\d+\.\d{2,}/g, m => String(round1(Number(m))));
}

/**
 * Render one effect line.
 * `shielded`: show the damage left after the target's shields (dv1/dv2).
 * `cost`: TP cost of the item, used when per-TP display is on.
 * `onEnemyItem`: the item is aimed at the enemy, so an on-caster effect is
 * flagged as landing on the leek instead.
 */
function buildSimEffectLine(ce, { shielded = false, cost = 0, onEnemyItem = false } = {}) {
    const useShielded = shielded && ce.dv1 !== undefined;
    const v1 = useShielded ? ce.dv1 : ce.v1;
    const v2 = useShielded ? ce.dv2 : ce.v2;

    const perTp = settings.perTpMode && cost > 0;
    const text = formatSimEffect(ce.id, v1, v2, perTp ? cost : 1);
    const stat = EFFECT_STATS[ce.id];
    const statIcon = stat
        ? `<img class="effect-stat-icon" src="public/image/charac/${stat}.png" alt="${stat}">`
        : '';
    const isBuff = BUFF_STAT_MAP[ce.id] !== undefined;
    // An on-caster effect on an enemy-aimed item goes against the item's arrow
    const backOnCaster = onEnemyItem && ce.onCaster;
    // An effect the target flags forbid on this aim is shown but never applied
    const notApplied = ce.applies === false;
    const classes = [
        'combo-effect-line',
        isBuff ? 'buff' : '',
        useShielded ? 'shielded' : '',
        backOnCaster ? 'on-caster' : '',
        notApplied ? 'not-applied' : '',
    ].filter(Boolean).join(' ');

    let title = '';
    if (notApplied) title = ` title="${t('not_applied_hint')}"`;
    else if (useShielded) title = ` title="${t('shielded_hint', { n: formatSimEffect(ce.id, ce.v1, ce.v2) })}"`;
    else if (backOnCaster) title = ` title="${t('caster_hint')}"`;

    const casterMark = backOnCaster ? `<span class="combo-effect-caster">🛡</span>` : '';
    const suffix = perTp ? `<span class="combo-effect-per-tp">${t('per_tp_suffix')}</span>` : '';
    return `<div class="${classes}"${title}>${casterMark}${statIcon}<span>${text}</span>${suffix}</div>`;
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

function buildPickerItem(item, currentTurn, totalStats, cooldownMap, targetStats) {
    const type = getItemType(item);
    const used = countInTurn(currentTurn, item);
    const max = getMaxUses(item);
    const atMax = used >= max;
    const cdLeft = cooldownMap.get(itemKey(item)) || 0;
    const onCooldown = cdLeft > 0;
    const disabled = atMax || onCooldown;
    const iconClass = type === 'weapon' ? 'combo-picker-icon weapon' : 'combo-picker-icon chip';

    const cdLabel = onCooldown ? `<span class="combo-picker-cooldown">CD ${cdLeft > 900 ? '∞' : cdLeft}</span>` : '';

    const critMult = getCritMultiplier(totalStats.agility);
    // The picker previews adding the item with its default aim.
    const aim = getDefaultTarget(item);
    const onEnemyItem = aim === TARGET_ENEMY;
    const effects = item.effects.map(e => {
        const { v1, v2 } = computeEffect(e, totalStats, critMult);
        const recipient = resolveRecipient(e, aim);
        const ce = { id: e.id, v1, v2, onCaster: recipient === 'caster', applies: recipient !== 'none' };
        if (recipient === 'enemy') {
            // Shields of the target as it stands after the selected turn's steps,
            // so vulnerabilities applied earlier in the combo lower them here too.
            storeShieldedDamage(ce, targetStats);
        }
        return buildSimEffectLine(ce, { shielded: onEnemyItem, cost: item.cost, onEnemyItem });
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
    const { item, effects, boosted, onCooldown, cooldownLeft, forceCrit, target, mult } = step;
    const type = getItemType(item);
    const iconClass = type === 'weapon' ? 'combo-entry-icon weapon' : 'combo-entry-icon chip';
    const isFirst = index === 0;
    const isLast = index === total - 1;
    const onTarget = target === TARGET_ENEMY;
    const effectsHtml = effects
        .map(ce => buildSimEffectLine(ce, { shielded: onTarget, cost: item.cost, onEnemyItem: onTarget }))
        .join('');
    const classes = [
        'combo-entry',
        boosted ? 'boosted' : '',
        onCooldown ? 'on-cooldown' : '',
        forceCrit ? 'force-crit' : '',
        onTarget ? 'on-target' : 'on-self',
    ].filter(Boolean).join(' ');
    const cooldownBadge = onCooldown
        ? `<span class="combo-entry-cooldown" title="${t('cooldown_title', { n: cooldownLeft })}">CD ${cooldownLeft > 900 ? '∞' : cooldownLeft}</span>`
        : '';
    const targetLabel = onTarget ? t('target_enemy') : t('target_self');

    // Only items whose effects scale with the number of entities hit get the stepper
    const multControl = hasMultipliedEffect(item)
        ? `<span class="combo-entry-mult${mult > 1 ? ' active' : ''}" title="${t('mult_title')}">
            <button class="combo-entry-mult-down" title="${t('mult_less')}">&minus;</button>
            <span class="combo-entry-mult-value">&times;${mult}</span>
            <button class="combo-entry-mult-up" title="${t('mult_more')}">+</button>
        </span>`
        : '';

    return `<div class="${classes}" data-turn="${turnIndex}" data-index="${index}">
        <button class="combo-entry-remove" title="${t('remove')}">&times;</button>
        <button class="combo-entry-crit${forceCrit ? ' active' : ''}" title="${t('toggle_crit')}">Crit</button>
        <button class="combo-entry-target${onTarget ? ' enemy' : ''}" title="${t('toggle_target')} (${targetLabel})">${onTarget ? '🎯' : '🛡'}</button>
        <div class="${iconClass}">
            <img src="${getItemIcon(item)}" alt="${item.name}">
        </div>
        <div class="combo-entry-info">
            <span class="combo-entry-name">${item.name.replace(/_/g, ' ')}</span>
            <span class="combo-entry-cost"><img src="public/image/charac/tp.png" alt="TP">${item.cost} TP${cooldownBadge}</span>
            ${multControl}
            <div class="combo-entry-effects">${effectsHtml}</div>
        </div>
        <div class="combo-entry-order">
            <button class="combo-entry-up${isFirst ? ' hidden' : ''}" title="${t('move_left')}">&#9664;</button>
            <span class="combo-entry-number">${index + 1}</span>
            <button class="combo-entry-down${isLast ? ' hidden' : ''}" title="${t('move_right')}">&#9654;</button>
        </div>
    </div>`;
}

/**
 * Total the effects of every step, one group per effect id.
 * `onCaster`: keep the effects landing on the leek (true) or on the enemy (false).
 * `shielded`: total the damage left after the target's shields, not the raw damage.
 */
function aggregateSimulated(allSteps, { onCaster, shielded = false } = {}) {
    const groups = {};
    for (const step of allSteps) {
        for (const ce of step.effects) {
            if (ce.applies === false) continue;
            if (ce.onCaster !== onCaster) continue;
            if (!groups[ce.id]) {
                groups[ce.id] = { id: ce.id, value1: 0, value2: 0, count: 0 };
            }
            const useShielded = shielded && ce.dv1 !== undefined;
            const g = groups[ce.id];
            g.value1 += useShielded ? ce.dv1 : ce.v1;
            g.value2 += useShielded ? ce.dv2 : ce.v2;
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

function renderPicker(leek, targetState) {
    const pickerList = document.querySelector('.combo-picker-list');
    const items = getEquippedItems(leek);
    const totalStats = flattenStats(leek.getTotalStats());
    const currentTurn = leek.combo[leek.selectedTurn] || [];
    const cooldownMap = computeCooldowns(leek.combo, leek.selectedTurn);
    // Preview damage against the target as it stands at the end of the selected
    // turn, so vulnerabilities already applied by the combo are reflected.
    const target = targetState || leek.targetStats;

    if (items.length === 0) {
        pickerList.innerHTML = `<p class="combo-empty">${t('combo_empty_picker')}</p>`;
        return;
    }

    pickerList.innerHTML = items.map(item => buildPickerItem(item, currentTurn, totalStats, cooldownMap, target)).join('');
}

function renderTurns(leek, turnResults) {
    const container = document.querySelector('.combo-turns-container');
    const canRemoveTurn = leek.combo.length > 1;

    let html = '';

    for (let ti = 0; ti < leek.combo.length; ti++) {
        const result = turnResults[ti] || { tpUsed: 0, tpTotal: 0, steps: [] };
        const isSelected = ti === leek.selectedTurn;
        const overflow = result.tpUsed > result.tpTotal;

        const removeBtn = canRemoveTurn
            ? `<button class="combo-turn-remove" data-turn="${ti}" title="${t('remove')}">&times;</button>`
            : '';

        const entriesHtml = result.steps.length > 0
            ? result.steps.map((step, i) => buildComboEntry(step, i, result.steps.length, ti)).join('')
            : `<p class="combo-empty">${t('combo_empty_turn')}</p>`;

        html += `<div class="combo-turn${isSelected ? ' selected' : ''}" data-turn="${ti}">
            <div class="combo-turn-header">
                <span class="combo-turn-label">${t('turn_n', { n: ti + 1 })}</span>
                <span class="combo-turn-tp${overflow ? ' overflow' : ''}">
                    <img src="public/image/charac/tp.png" alt="TP">
                    ${result.tpUsed} / ${result.tpTotal} TP
                </span>
                ${removeBtn}
            </div>
            <div class="combo-turn-items">${entriesHtml}</div>
        </div>`;
    }

    html += `<button class="combo-add-turn-btn">${t('add_turn')}</button>`;

    container.innerHTML = html;
}

function renderTargetPanel(leek) {
    const panel = document.querySelector('.combo-target-panel');
    if (!panel) return;
    const ts = leek.targetStats;
    const fields = TARGET_FIELDS.map(f => `
        <label class="combo-target-field">
            <img src="public/image/charac/${f.icon}.png" alt="${f.icon}">
            <span class="combo-target-field-label">${t(f.labelKey)}</span>
            <input type="number" class="combo-target-input" data-stat="${f.key}" value="${ts[f.key]}"${f.allowNegative ? '' : ' min="0"'}>
        </label>`).join('');
    panel.innerHTML = `
        <div class="combo-target-panel-header">🎯 ${t('target_title')}</div>
        <div class="combo-target-fields">${fields}</div>`;
}

function renderSelfSummary(turnResults) {
    const summaryList = document.querySelector('.combo-summary-list');
    const allSteps = turnResults.flatMap(tr => tr.steps);
    const groups = aggregateSimulated(allSteps, { onCaster: true });

    if (groups.length === 0) {
        summaryList.innerHTML = `<p class="combo-empty">${t('combo_summary_none')}</p>`;
        return;
    }

    summaryList.innerHTML = groups.map(g => buildSummaryLine(g)).join('');
}

function buildTargetTotalBox(kind, text, icon, remaining, max) {
    return `<div class="combo-target-total combo-target-total-${kind}">
        <span class="combo-target-total-text">${text}</span>
        <span class="combo-target-total-left">
            <img src="public/image/charac/${icon}.png" alt="${icon}">${remaining} / ${max}
        </span>
    </div>`;
}

function renderTargetSummary(turnResults, leek) {
    const list = document.querySelector('.combo-target-summary-list');
    if (!list) return;
    const allSteps = turnResults.flatMap(tr => tr.steps);
    const groups = aggregateSimulated(allSteps, { onCaster: false, shielded: true });

    if (groups.length === 0) {
        list.innerHTML = `<p class="combo-empty">${t('combo_target_none')}</p>`;
        return;
    }

    const last = turnResults[turnResults.length - 1]?.target;
    const maxLife = last ? last.maxLife : leek.targetStats.life;
    const finalLife = last ? last.life : leek.targetStats.life;
    const dealt = Math.max(0, leek.targetStats.life - finalLife);
    const tpShackled = last ? leek.targetStats.tp - last.tp : 0;
    const mpShackled = last ? leek.targetStats.mp - last.mp : 0;

    const headlineParts = [];
    if (dealt > 0) {
        headlineParts.push(buildTargetTotalBox('life', t('target_damage_dealt', { n: dealt }), 'life', finalLife, maxLife));
    }
    if (tpShackled > 0) {
        headlineParts.push(buildTargetTotalBox('tp', t('target_tp_shackled', { n: tpShackled }), 'tp', last.tp, leek.targetStats.tp));
    }
    if (mpShackled > 0) {
        headlineParts.push(buildTargetTotalBox('mp', t('target_mp_shackled', { n: mpShackled }), 'mp', last.mp, leek.targetStats.mp));
    }
    const headline = headlineParts.length
        ? `<div class="combo-target-totals">${headlineParts.join('')}</div>`
        : '';

    list.innerHTML = headline + groups.map(g => buildSummaryLine(g)).join('');
}

const CRIT_MODES = ['never', 'average', 'always'];
const CRIT_LABEL_KEYS = { never: 'crit_off', average: 'crit_avg', always: 'crit_on' };
const CRIT_TOOLTIP_KEYS = { never: 'crit_tooltip_never', average: 'crit_tooltip_average', always: 'crit_tooltip_always' };

export function initComboTab(leek) {
    const container = document.querySelector('.combo-turns-container');
    const pickerList = document.querySelector('.combo-picker-list');
    const clearBtn = document.querySelector('.combo-clear-btn');
    const critToggle = document.querySelector('.combo-crit-toggle');
    const perTpToggle = document.querySelector('.combo-per-tp-toggle');

    // Crit toggle: cycles never → average → always → never
    critToggle.addEventListener('click', () => {
        const idx = CRIT_MODES.indexOf(settings.critMode);
        settings.critMode = CRIT_MODES[(idx + 1) % CRIT_MODES.length];
        critToggle.textContent = t(CRIT_LABEL_KEYS[settings.critMode]);
        critToggle.title = t(CRIT_TOOLTIP_KEYS[settings.critMode]);
        critToggle.dataset.mode = settings.critMode;
        refresh();
    });

    // Per-TP toggle: divide effect values by the item's TP cost
    perTpToggle.addEventListener('click', () => {
        settings.perTpMode = !settings.perTpMode;
        perTpToggle.classList.toggle('active', settings.perTpMode);
        refresh();
    });

    function refresh() {
        const baseStats = flattenStats(leek.getTotalStats());
        const turnResults = simulateCombo(leek.combo, leek.comboCrits, leek.comboTargets, leek.comboMults, baseStats, leek.targetStats);
        renderTurns(leek, turnResults);
        renderSelfSummary(turnResults);
        renderTargetSummary(turnResults, leek);
        renderPicker(leek, turnResults[leek.selectedTurn]?.target);
    }

    function refreshTargetPanel() {
        renderTargetPanel(leek);
    }

    refresh();
    refreshTargetPanel();

    // Target stat inputs
    const targetPanel = document.querySelector('.combo-target-panel');
    if (targetPanel) {
        targetPanel.addEventListener('change', (e) => {
            const input = e.target.closest('.combo-target-input');
            if (!input) return;
            const stat = input.dataset.stat;
            const rounded = Math.round(Number(input.value) || 0);
            const value = allowsNegative(stat) ? rounded : Math.max(0, rounded);
            input.value = value;
            leek.setTargetStat(stat, value);
        });
    }

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
            } else if (e.target.closest('.combo-entry-target')) {
                leek.toggleComboTarget(turnIndex, index);
                return;
            } else if (e.target.closest('.combo-entry-mult-up')) {
                leek.setComboMult(turnIndex, index, (leek.comboMults[turnIndex][index] || 1) + 1);
                return;
            } else if (e.target.closest('.combo-entry-mult-down')) {
                leek.setComboMult(turnIndex, index, (leek.comboMults[turnIndex][index] || 1) - 1);
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
    leek.on('computed', () => { refresh(); refreshTargetPanel(); });
}
