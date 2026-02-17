// Compact effect descriptions keyed by effect id
export const EFFECT_LABELS = {
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
export const EFFECT_STATS = {
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

export function formatEffect(effect) {
    const fn = EFFECT_LABELS[effect.id];
    if (!fn) return `Effect #${effect.id}`;
    return fn(effect.value1, effect.value2);
}

export function formatComputedEffect(effect, totalStats) {
    const stat = EFFECT_STATS[effect.id];
    if (!stat || !totalStats) return formatEffect(effect);

    const multiplier = 1 + (totalStats[stat] || 0) / 100;
    const v1 = Math.round(effect.value1 * multiplier);
    const v2 = effect.value2 ? Math.round((effect.value1 + effect.value2) * multiplier) - v1 : 0;

    const fn = EFFECT_LABELS[effect.id];
    if (!fn) return `Effect #${effect.id}`;
    return fn(v1, v2);
}
