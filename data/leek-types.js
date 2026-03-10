// Base stats per leek type.
// Each stat is [value_at_level_1, value_at_level_301].
// Interpolation between levels is linear.
export const LEEK_TYPES = {
    1: {
        life:       [100, 1000],
        strength:   [0,   0],
        wisdom:     [0,   0],
        resistance: [0,   0],
        agility:    [0,   0],
        science:    [0,   0],
        magic:      [0,   0],
        frequency:  [100, 100],
        cores:      [1,   1],
        ram:        [6,   6],
        tp:         [10,  10],
        mp:         [3,   3]
    }
};
