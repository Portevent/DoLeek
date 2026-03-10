// Updates the recap zone stats display with current leek stats
import { formatEffect, formatComputedEffect } from '../data/effects.js';
import { settings } from '../model/settings.js';
import { t } from '../model/i18n.js';
import { isCapitalOverflow } from './stats-tab.js';
import { LEEK_TYPE_META } from '../data/leek-types.js';

const MAX_COMPONENTS = 8;

function getMaxWeapons(level) {
    if (level >= 200) return 4;
    if (level >= 100) return 3;
    return 2;
}

function setZoneError(zoneClass, hasError) {
    const h3 = document.querySelector(`.${zoneClass} h3`);
    if (h3) h3.classList.toggle('error', hasError);
}

function buildDetailForComponent(component) {
    const statsHtml = component.stats.map(([stat, value]) =>
        `<div class="detail-stat">
            <img src="public/image/charac/${stat}.png" alt="${stat}">
            <span>${value} ${stat}</span>
        </div>`
    ).join('');
    return `<div class="detail-header">
            <img class="detail-icon" src="public/image/component/${component.name}.png" alt="${component.name}">
            <span class="detail-name">${component.name.replace(/_/g, ' ')}</span>
        </div>
        <div class="detail-stats">${statsHtml}</div>`;
}

function buildDetailForItem(item, type, totalStats) {
    const imgDir = type === 'weapon' ? 'weapon' : 'chip';
    const meta = [];
    meta.push(`<span class="detail-meta-entry"><img src="public/image/charac/tp.png" alt="TP">${item.cost} TP</span>`);
    if (item.cooldown > 0) meta.push(`<span class="detail-meta-entry">${item.cooldown}t cd</span>`);
    if (item.max_uses > 0) meta.push(`<span class="detail-meta-entry">${item.max_uses}${t('per_turn')}</span>`);

    const effectsHtml = item.effects.map(e => {
        const text = settings.computedMode ? formatComputedEffect(e, totalStats) : formatEffect(e);
        return `<div class="detail-stat"><span>${text}</span></div>`;
    }).join('');

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
    setZoneError('zone-1', leek.components.length > MAX_COMPONENTS);
}

function updateRecapWeapons(leek) {
    const list = document.querySelector('.recap-weapons-list');
    if (!list) return;
    if (leek.weapons.length === 0) {
        list.innerHTML = '';
    } else {
        list.innerHTML = leek.weapons.map((w, i) =>
            `<div class="recap-item" data-type="weapon" data-index="${i}"><img src="public/image/weapon/${w.name}.png" alt="${w.name}"></div>`
        ).join('');
    }
    updateZone3Error(leek);
}

function updateRecapChips(leek) {
    const list = document.querySelector('.recap-chips-list');
    if (!list) return;
    if (leek.chips.length === 0) {
        list.innerHTML = '';
    } else {
        const sorted = leek.chips
            .map((c, i) => ({ chip: c, index: i }))
            .sort((a, b) => a.chip.type - b.chip.type || a.chip.level - b.chip.level);
        list.innerHTML = sorted.map(({ chip, index }) =>
            `<div class="recap-item" data-type="chip" data-index="${index}"><img src="public/image/chip/${chip.name}.png" alt="${chip.name}"></div>`
        ).join('');
    }
    updateZone3Error(leek);
}

function updateZone3Error(leek) {
    const totalStats = leek.getTotalStats();
    const chipsOverflow = leek.chips.length > totalStats.ram;
    const weaponsOverflow = leek.weapons.length > getMaxWeapons(leek.level);
    setZoneError('zone-3', chipsOverflow || weaponsOverflow);
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
    const typeMeta = LEEK_TYPE_META[leek.type] || LEEK_TYPE_META[1];
    leekImage.src = typeMeta.image(leek.level);

    setZoneError('zone-2', isCapitalOverflow(leek));
    updateZone3Error(leek);
}

function updateRecapLevel(leek) {
    const el = document.querySelector('.recap-leek-level');
    if (el) el.textContent = 'Niv. ' + leek.level;
}

export function initRecapStats(leek) {
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
        const totalStats = leek.getTotalStats();
        if (type === 'weapon' && leek.weapons[index]) {
            showItemDetail(buildDetailForItem(leek.weapons[index], 'weapon', totalStats));
        } else if (type === 'chip' && leek.chips[index]) {
            showItemDetail(buildDetailForItem(leek.chips[index], 'chip', totalStats));
        }
    });

    // Observe model changes to update recap
    leek.on('stats', () => updateRecapStats(leek));
    leek.on('level', () => {
        updateRecapLevel(leek);
        updateRecapStats(leek);
    });
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
    updateRecapLevel(leek);
    updateRecapStats(leek);
    updateRecapComponents(leek);
    updateRecapChips(leek);
    updateRecapWeapons(leek);
}
