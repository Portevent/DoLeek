import Stats from './stats.js';

class Leek {
    constructor(name = '') {
        this.name = name;
        this.level = 301;
        this.baseStats = new Stats();
        this.bonusStats = new Stats();
        this.components = [];
        this.chips = [];
        this.weapons = [];
        this._listeners = {};

        // Initialize base stats
        this.updateBaseStats();
    }

    // Base life: 100 at level 1, + 3 per level afterward
    getBaseLife() {
        return 100 + ((this.level - 1) * 3);
    }

    // Capital: 50 at level 1, +5 per level afterward
    getCapital() {
        return 50 + ((this.level - 1) * 5)
            + (this.level >= 100 ? 45 : 0)
            + (this.level >= 200 ? 45 : 0)
            + (this.level >= 300 ? 45 : 0)
            + (this.level >= 301 ? 95 : 0);
    }

    updateBaseStats() {
        this.baseStats.reset();
        this.baseStats.life = this.getBaseLife();
        this.baseStats.tp = 10;
        this.baseStats.mp = 6;
        this.baseStats.ram = 6;
        this.baseStats.cores = 1;
    }

    on(event, callback) {
        if (!this._listeners[event]) {
            this._listeners[event] = [];
        }
        this._listeners[event].push(callback);
    }

    emit(event) {
        const callbacks = this._listeners[event];
        if (callbacks) {
            callbacks.forEach(cb => cb(this));
        }
    }

    setLevel(level) {
        this.level = Math.max(1, Math.min(301, level));
        this.updateBaseStats();
        this.emit('level');
    }

    // Get total stats (base + bonus + components)
    getTotalStats() {
        const total = this.baseStats.clone();
        total.add(this.bonusStats);
        for (const component of this.components) {
            for (const [stat, value] of component.stats) {
                total[stat] += value;
            }
        }
        return total;
    }

    // Component management
    addComponent(component) {
        this.components.push(component);
        this.emit('components');
    }

    removeComponent(index) {
        this.components.splice(index, 1);
        this.emit('components');
    }

    // Chip management
    addChip(chip) {
        this.chips.push(chip);
        this.emit('chips');
    }

    removeChip(index) {
        this.chips.splice(index, 1);
        this.emit('chips');
    }

    // Weapon management
    addWeapon(weapon) {
        this.weapons.push(weapon);
        this.emit('weapons');
    }

    removeWeapon(index) {
        this.weapons.splice(index, 1);
        this.emit('weapons');
    }
}

export default Leek;

