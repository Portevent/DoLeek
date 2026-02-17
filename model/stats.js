class Stats {
    constructor() {
        this.life = 0;       // Points de Vie
        this.strength = 0;   // Force
        this.wisdom = 0;     // Sagesse
        this.resistance = 0; // Résistance
        this.agility = 0;    // Agilité
        this.science = 0;    // Science
        this.magic = 0;      // Magie
        this.frequency = 0;  // Fréquence
        this.cores = 0;      // Coeurs
        this.ram = 0;        // RAM
        this.tp = 0;         // PT (Points de Tour)
        this.mp = 0;         // PM (Points de Mouvement)
    }

    // Set all stats at once
    setAll(stats) {
        Object.assign(this, stats);
    }

    // Add stats from another Stats object or plain object
    add(stats) {
        this.life += stats.life || 0;
        this.strength += stats.strength || 0;
        this.wisdom += stats.wisdom || 0;
        this.resistance += stats.resistance || 0;
        this.agility += stats.agility || 0;
        this.science += stats.science || 0;
        this.magic += stats.magic || 0;
        this.frequency += stats.frequency || 0;
        this.cores += stats.cores || 0;
        this.ram += stats.ram || 0;
        this.tp += stats.tp || 0;
        this.mp += stats.mp || 0;
    }

    // Reset all stats to zero
    reset() {
        this.life = 0;
        this.strength = 0;
        this.wisdom = 0;
        this.resistance = 0;
        this.agility = 0;
        this.science = 0;
        this.magic = 0;
        this.frequency = 0;
        this.cores = 0;
        this.ram = 0;
        this.tp = 0;
        this.mp = 0;
    }

    // Clone this stats object
    clone() {
        const copy = new Stats();
        copy.setAll(this);
        return copy;
    }
}

export default Stats;


export const COSTS= {
    life : [
        {step : 0, capital : 1, sup : 4},
        {step : 1000, capital : 1, sup : 3},
        {step : 2000, capital : 1, sup : 2},
    ],
    strength : [
        {step : 0, capital : 1, sup : 2},
        {step : 200, capital : 1, sup : 1},
        {step : 400, capital : 2, sup : 1},
        {step : 600, capital : 3, sup : 1},
    ],
    wisdom : [
        {step : 0, capital : 1, sup : 2},
        {step : 200, capital : 1, sup : 1},
        {step : 400, capital : 2, sup : 1},
        {step : 600, capital : 3, sup : 1},
    ],
    agility : [
        {step : 0, capital : 1, sup : 2},
        {step : 200, capital : 1, sup : 1},
        {step : 400, capital : 2, sup : 1},
        {step : 600, capital : 3, sup : 1},
    ],
    resistance : [
        {step : 0, capital : 1, sup : 2},
        {step : 200, capital : 1, sup : 1},
        {step : 400, capital : 2, sup : 1},
        {step : 600, capital : 3, sup : 1},
    ],
    science : [
        {step : 0, capital : 1, sup : 2},
        {step : 200, capital : 1, sup : 1},
        {step : 400, capital : 2, sup : 1},
        {step : 600, capital : 3, sup : 1},
    ],
    magic : [
        {step : 0, capital : 1, sup : 2},
        {step : 200, capital : 1, sup : 1},
        {step : 400, capital : 2, sup : 1},
        {step : 600, capital : 3, sup : 1},
    ],
    frequency : [
        {step : 0, capital : 1, sup : 1}
    ],
    cores : [
        {step : 0, capital : 20, sup : 1},
        {step : 1, capital : 30, sup : 1},
        {step : 2, capital : 40, sup : 1},
        {step : 3, capital : 50, sup : 1},
        {step : 4, capital : 60, sup : 1},
        {step : 5, capital : 70, sup : 1},
        {step : 6, capital : 80, sup : 1},
        {step : 7, capital : 90, sup : 1},
        {step : 8, capital : 100, sup : 1},
    ],
    ram : [
        {step : 0, capital : 20, sup : 1},
        {step : 1, capital : 30, sup : 1},
        {step : 2, capital : 40, sup : 1},
        {step : 3, capital : 50, sup : 1},
        {step : 4, capital : 60, sup : 1},
        {step : 5, capital : 70, sup : 1},
        {step : 6, capital : 80, sup : 1},
        {step : 7, capital : 90, sup : 1},
        {step : 8, capital : 100, sup : 1},
    ],
    tp : [
        {step : 0, capital : 30, sup : 1}, {step : 1, capital : 35, sup : 1},
        {step : 2, capital : 40, sup : 1}, {step : 3, capital : 45, sup : 1},
        {step : 4, capital : 50, sup : 1}, {step : 5, capital : 55, sup : 1},
        {step : 6, capital : 60, sup : 1}, {step : 7, capital : 65, sup : 1},
        {step : 8, capital : 70, sup : 1}, {step : 9, capital : 75, sup : 1},
        {step : 10, capital : 80, sup : 1}, {step : 11, capital : 85, sup : 1},
        {step : 12, capital : 90, sup : 1}, {step : 13, capital : 95, sup : 1},
        {step : 14, capital : 100, sup : 1}
    ],
    mp : [
        {step : 0, capital : 20, sup : 1},
        {step : 1, capital : 40, sup : 1},
        {step : 2, capital : 60, sup : 1},
        {step : 3, capital : 80, sup : 1},
        {step : 4, capital : 100, sup : 1},
        {step : 5, capital : 120, sup : 1},
        {step : 6, capital : 140, sup : 1},
        {step : 7, capital : 160, sup : 1},
        {step : 8, capital : 180, sup : 1}
    ]
}