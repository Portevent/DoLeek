// Target selection for combo casting.
// An item can be cast on the leek itself ('self') or on an enemy ('target').

export const TARGET_SELF = 'self';
export const TARGET_ENEMY = 'target';

// Chip categories (chip.type) that are, by default, cast on an enemy target:
//   1 = damage (offensive), 6 = poison (offensive), 7 = tactic (debuff)
// Every other chip category (heal, shield, buff, return, summon, special)
// defaults to being cast on the leek itself.
const OFFENSIVE_CHIP_TYPES = new Set([1, 6, 7]);

/**
 * Default target for a weapon or chip.
 * Weapons always default to the enemy target; chips depend on their category.
 */
export function getDefaultTarget(item) {
    // Weapons carry an `item` field (equipment id); chips do not.
    if (item.item !== undefined) return TARGET_ENEMY;
    return OFFENSIVE_CHIP_TYPES.has(item.type) ? TARGET_ENEMY : TARGET_SELF;
}
