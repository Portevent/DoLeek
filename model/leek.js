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
        this.combo = [[]];         // array of turns, each turn is array of items
        this.comboCrits = [[]];    // mirrors combo: per-item forced crit (true/false)
        this.selectedTurn = 0;
        this.comboStats = new Stats();
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
        this.baseStats.frequency = 100;
        this.baseStats.tp = 10;
        this.baseStats.mp = 3;
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

    // Combo management (multi-turn)
    addComboItem(item, turnIndex = this.selectedTurn) {
        if (turnIndex >= 0 && turnIndex < this.combo.length) {
            this.combo[turnIndex].push(item);
            this.comboCrits[turnIndex].push(false);
            this.emit('combo');
        }
    }

    removeComboItem(turnIndex, itemIndex) {
        if (turnIndex >= 0 && turnIndex < this.combo.length) {
            this.combo[turnIndex].splice(itemIndex, 1);
            this.comboCrits[turnIndex].splice(itemIndex, 1);
            this.emit('combo');
        }
    }

    moveComboItem(turnIndex, from, to) {
        if (from === to) return;
        const turn = this.combo[turnIndex];
        if (!turn) return;
        const [item] = turn.splice(from, 1);
        turn.splice(to, 0, item);
        const [crit] = this.comboCrits[turnIndex].splice(from, 1);
        this.comboCrits[turnIndex].splice(to, 0, crit);
        this.emit('combo');
    }

    toggleComboCrit(turnIndex, itemIndex) {
        if (turnIndex >= 0 && turnIndex < this.comboCrits.length) {
            this.comboCrits[turnIndex][itemIndex] = !this.comboCrits[turnIndex][itemIndex];
            this.emit('combo');
        }
    }

    clearCombo() {
        this.combo = [[]];
        this.comboCrits = [[]];
        this.selectedTurn = 0;
        this.comboStats.reset();
        this.emit('combo');
    }

    addTurn() {
        this.combo.push([]);
        this.comboCrits.push([]);
        this.selectedTurn = this.combo.length - 1;
        this.emit('combo');
    }

    removeTurn(turnIndex) {
        if (this.combo.length <= 1) return;
        this.combo.splice(turnIndex, 1);
        this.comboCrits.splice(turnIndex, 1);
        if (this.selectedTurn >= this.combo.length) {
            this.selectedTurn = this.combo.length - 1;
        }
        this.emit('combo');
    }

    selectTurn(turnIndex) {
        if (turnIndex >= 0 && turnIndex < this.combo.length) {
            this.selectedTurn = turnIndex;
            this.emit('combo');
        }
    }

    updateComboStats() {
        this.comboStats.reset();
    }
}

export default Leek;

