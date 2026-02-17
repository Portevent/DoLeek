// Updates the recap zone stats display with current leek stats
import { formatEffect } from '../data/effects.js';

function buildDetailForComponent(component) {
    const statsHtml = component.stats.map(([stat, value]) =>
        `<div class="detail-stat">
            <img src="public/image/charac/${stat}.png" alt="${stat}">
            <span>${value > 0 ? '+' : ''}${value} ${stat}</span>
        </div>`
    ).join('');
    return `<div class="detail-header">
            <img class="detail-icon" src="public/image/component/${component.name}.png" alt="${component.name}">
            <span class="detail-name">${component.name.replace(/_/g, ' ')}</span>
        </div>
        <div class="detail-stats">${statsHtml}</div>`;
}

function buildDetailForItem(item, type) {
    const imgDir = type === 'weapon' ? 'weapon' : 'chip';
    const meta = [];
    meta.push(`<span class="detail-meta-entry"><img src="public/image/charac/tp.png" alt="TP">${item.cost} TP</span>`);
    if (item.cooldown > 0) meta.push(`<span class="detail-meta-entry">${item.cooldown}t cd</span>`);
    if (item.max_uses > 0) meta.push(`<span class="detail-meta-entry">${item.max_uses}/turn</span>`);

    const effectsHtml = item.effects.map(e =>
        `<div class="detail-stat"><span>${formatEffect(e)}</span></div>`
    ).join('');

    return `<div class="detail-header">
            <img class="detail-icon detail-icon-${type}" src="public/image/${imgDir}/${item.name}.png" alt="${item.name}">
            <div>
                <span class="detail-name">${item.name.replace(/_/g, ' ')}</span>
                <span class="detail-level">Lvl ${item.level}</span>
            </div>
        </div>
        <div class="detail-meta">${meta.join('')}</div>
        <div class="detail-stats">${effectsHtml}</div>`;
}

function showItemDetail(html) {
    const zone = document.querySelector('.zone-4');
    const detail = zone.querySelector('.item-detail');
    detail.innerHTML = html;
    zone.style.display = '';
}

function hideItemDetail() {
    const zone = document.querySelector('.zone-4');
    zone.style.display = 'none';
}

function updateRecapComponents(leek) {
    for (let i = 1; i <= 8; i++) {
        const slot = document.querySelector(`[data-slot="component-${i}"]`);
        if (!slot) continue;
        const component = leek.components[i - 1];
        if (component) {
            slot.classList.remove('empty');
            slot.innerHTML = `<img src="public/image/component/${component.name}.png" alt="${component.name}">`;
        } else {
            slot.classList.add('empty');
            slot.innerHTML = '';
        }
    }
}

function updateRecapWeapons(leek) {
    const list = document.querySelector('.recap-weapons-list');
    if (!list) return;
    if (leek.weapons.length === 0) {
        list.innerHTML = '';
        return;
    }
    list.innerHTML = leek.weapons.map((w, i) =>
        `<div class="recap-item" data-type="weapon" data-index="${i}"><img src="public/image/weapon/${w.name}.png" alt="${w.name}"></div>`
    ).join('');
}

function updateRecapChips(leek) {
    const list = document.querySelector('.recap-chips-list');
    if (!list) return;
    if (leek.chips.length === 0) {
        list.innerHTML = '';
        return;
    }
    list.innerHTML = leek.chips.map((c, i) =>
        `<div class="recap-item" data-type="chip" data-index="${i}"><img src="public/image/chip/${c.name}.png" alt="${c.name}"></div>`
    ).join('');
}

export function updateRecapStats(leek) {
    const statElements = document.querySelectorAll('.recap-stats .recap-stat');
    const totalStats = leek.getTotalStats();

    statElements.forEach(element => {
        const statName = element.dataset.stat;
        const valueSpan = element.querySelector('span');

        if (statName && valueSpan && totalStats[statName] !== undefined) {
            valueSpan.textContent = totalStats[statName];
        }
    });

    const leekImage = document.getElementById('leek-display');
    leekImage.src = "public/image/leek/leek" + (1 + Math.floor(leek.level / 32)) + "_front_green.png";
}

export function initRecapStats(leek) {
    // Initialize level input
    const levelInput = document.getElementById('leek-level');

    if (levelInput) {
        levelInput.value = leek.level;

        const onLevelChange = () => {
            const level = parseInt(levelInput.value, 10) || 1;
            leek.setLevel(level);
            levelInput.value = leek.level;
        };
        levelInput.addEventListener('input', onLevelChange);
        levelInput.addEventListener('change', onLevelChange);
    }

    // Click on component slot to show detail
    document.querySelector('.leek-display').addEventListener('click', (e) => {
        const slot = e.target.closest('.component');
        if (!slot) return;
        const slotIndex = parseInt(slot.dataset.slot.replace('component-', ''), 10) - 1;
        const component = leek.components[slotIndex];
        if (component) {
            showItemDetail(buildDetailForComponent(component));
        }
    });

    // Click on weapon/chip in recap to show detail
    document.querySelector('.recap-items').addEventListener('click', (e) => {
        const item = e.target.closest('.recap-item');
        if (!item) return;
        const type = item.dataset.type;
        const index = parseInt(item.dataset.index, 10);
        if (type === 'weapon' && leek.weapons[index]) {
            showItemDetail(buildDetailForItem(leek.weapons[index], 'weapon'));
        } else if (type === 'chip' && leek.chips[index]) {
            showItemDetail(buildDetailForItem(leek.chips[index], 'chip'));
        }
    });

    // Observe model changes to update recap
    leek.on('stats', () => updateRecapStats(leek));
    leek.on('level', () => updateRecapStats(leek));
    leek.on('components', () => {
        updateRecapComponents(leek);
        updateRecapStats(leek);
        hideItemDetail();
    });
    leek.on('chips', () => {
        updateRecapChips(leek);
        hideItemDetail();
    });
    leek.on('weapons', () => {
        updateRecapWeapons(leek);
        hideItemDetail();
    });

    // Initial update
    updateRecapStats(leek);
    updateRecapComponents(leek);
    updateRecapChips(leek);
    updateRecapWeapons(leek);
}
