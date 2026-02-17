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
        return 50 + ((this.level - 1) * 5);
    }

    updateBaseStats() {
        this.baseStats.reset();
        this.baseStats.life = this.getBaseLife();
        this.baseStats.tp = 10;
        this.baseStats.mp = 6;
        this.baseStats.ram = 6;
        this.baseStats.core = 1;
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

    // Get total stats (base + bonus)
    getTotalStats() {
        const total = this.baseStats.clone();
        total.add(this.bonusStats);
        return total;
    }

    // Component management
    addComponent(component) {
        this.components.push(component);
    }

    removeComponent(index) {
        this.components.splice(index, 1);
    }

    // Chip management
    addChip(chip) {
        this.chips.push(chip);
    }

    removeChip(index) {
        this.chips.splice(index, 1);
    }

    // Weapon management
    addWeapon(weapon) {
        this.weapons.push(weapon);
    }

    removeWeapon(index) {
        this.weapons.splice(index, 1);
    }
}

export default Leek;

