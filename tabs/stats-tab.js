// Handles the Stats editing tab with sliders and buttons
// Edits bonus stats only (base stats are calculated from level)

import { COSTS } from '../model/stats.js';
import { t } from '../model/i18n.js';

// Compute the capital spent for a given bonus stat value using the COSTS table
function computeStatCapital(statName, bonusValue) {
    const tiers = COSTS[statName];
    if (!tiers || bonusValue <= 0) return 0;

    let capital = 0;
    let remaining = bonusValue;

    for (let i = 0; i < tiers.length && remaining > 0; i++) {
        const tier = tiers[i];
        const nextStep = (i + 1 < tiers.length) ? tiers[i + 1].step : Infinity;
        const tierRange = nextStep - tier.step;
        const bonusInTier = Math.min(remaining, tierRange);
        const upgrades = Math.ceil(bonusInTier / tier.sup);
        capital += upgrades * tier.capital;
        remaining -= upgrades * tier.sup;
    }

    return capital;
}

// Compute total capital spent across all stats
function getSpentCapital(leek) {
    let total = 0;
    for (const stat in COSTS) {
        total += computeStatCapital(stat, leek.bonusStats[stat] || 0);
    }
    return total;
}

// Get the current cost tier for a stat given its bonus value
function getCurrentTier(statName, bonusValue) {
    const tiers = COSTS[statName];
    let current = tiers[0];
    for (const tier of tiers) {
        if (bonusValue >= tier.step) {
            current = tier;
        } else {
            break;
        }
    }
    return current;
}

// Add steps until at least targetAmount of bonus stats have been added
function addAtLeast(statName, currentBonus, targetAmount) {
    let bonus = currentBonus;
    let added = 0;

    while (added < targetAmount) {
        const tier = getCurrentTier(statName, bonus);
        bonus += tier.sup;
        added += tier.sup;
    }

    return bonus;
}

// Remove steps until at least targetAmount of bonus stats have been removed
function removeAtLeast(statName, currentBonus, targetAmount) {
    let bonus = currentBonus;
    let removed = 0;

    while (removed < targetAmount && bonus > 0) {
        const prevBonus = bonus - 1;
        const tier = getCurrentTier(statName, Math.max(0, prevBonus));
        bonus -= tier.sup;
        removed += tier.sup;
    }

    return Math.max(0, bonus);
}

function updateInvestedState(statName, bonusValue) {
    const statsPanel = document.getElementById('stats');
    if (!statsPanel) return;
    const td = statsPanel.querySelector(`.stat-buttons[data-stat="${statName}"]`)?.closest('td');
    if (td) td.classList.toggle('invested', bonusValue > 0);
}

function updateStatDisplay(statName, leek) {
    const statsPanel = document.getElementById('stats');
    if (!statsPanel) return;

    const valueDisplay = statsPanel.querySelector(`.stat-value[data-stat="${statName}"]`);
    const costDisplay = statsPanel.querySelector(`.stat-buttons[data-stat="${statName}"]`)
        ?.closest('td')?.querySelector('.stat-cost-current');

    if (valueDisplay) valueDisplay.textContent = leek.bonusStats[statName];

    if (costDisplay) {
        const tier = getCurrentTier(statName, leek.bonusStats[statName]);
        costDisplay.textContent = `${tier.capital} cap → +${tier.sup}`;
    }

    highlightCurrentTier(statName, leek.bonusStats[statName]);
    updateInvestedState(statName, leek.bonusStats[statName]);
    updateCapitalDisplay(leek);
    leek.emit('stats');
}

function highlightCurrentTier(statName, bonusValue) {
    const tiers = COSTS[statName];
    if (!tiers) return;

    const table = document.querySelector(`.cost-table[data-stat="${statName}"]`);
    if (table) {
        const rows = table.querySelectorAll(':scope > tbody > tr');
        rows.forEach((row, i) => {
            if (i >= tiers.length) return;
            const tier = tiers[i];
            const nextStep = (i + 1 < tiers.length) ? tiers[i + 1].step : Infinity;
            if (bonusValue >= tier.step && bonusValue < nextStep) {
                row.classList.add('active-tier');
            } else {
                row.classList.remove('active-tier');
            }
        });
    }

    const indicators = document.querySelector(`.tier-indicators[data-stat="${statName}"]`);
    if (indicators) {
        const rects = indicators.querySelectorAll('.tier-indicator');
        const dots = indicators.querySelectorAll('.tier-dot');
        rects.forEach((rect, i) => {
            if (i >= tiers.length) return;
            const tier = tiers[i];
            const nextStep = (i + 1 < tiers.length) ? tiers[i + 1].step : Infinity;
            const inTier = bonusValue >= tier.step && bonusValue < nextStep;
            const atStep = bonusValue === tier.step;
            rect.classList.toggle('active', inTier && !atStep);
            rect.classList.toggle('passed', bonusValue >= nextStep);
        });
        dots.forEach((dot, i) => {
            if (i >= tiers.length) return;
            const tier = tiers[i];
            const atStep = bonusValue === tier.step;
            dot.classList.toggle('active', atStep);
            dot.classList.toggle('passed', bonusValue > tier.step);
        });
    }
}

export function updateCapitalDisplay(leek) {
    const totalCapital = leek.getCapital();
    const spentCapital = getSpentCapital(leek);
    const remainingCapital = totalCapital - spentCapital;

    const remainingEl = document.getElementById('capital-remaining');
    const totalEl = document.getElementById('capital-total');

    if (remainingEl && totalEl) {
        remainingEl.textContent = remainingCapital.toString();
        totalEl.textContent = totalCapital;

        if (remainingCapital < 0) {
            remainingEl.classList.add('negative');
        } else {
            remainingEl.classList.remove('negative');
        }
    }
}

function getStatLabels() {
    return {
        life: t('stat_life'),
        strength: t('stat_strength'),
        wisdom: t('stat_wisdom'),
        agility: t('stat_agility'),
        resistance: t('stat_resistance'),
        science: t('stat_science'),
        magic: t('stat_magic'),
        frequency: t('stat_frequency'),
        cores: t('stat_cores'),
        ram: t('stat_ram'),
        tp: t('stat_tp'),
        mp: t('stat_mp'),
    };
}

// Layout: pairs of stats displayed side by side
const STAT_PAIRS = [
    ['life', 'magic'],
    ['strength', 'frequency'],
    ['wisdom', 'cores'],
    ['agility', 'ram'],
    ['resistance', 'mp'],
    ['science', 'tp'],
];

const STAT_LITE = {
    life: false,
    strength: false,
    wisdom: false,
    agility: false,
    resistance: false,
    science: false,
    magic: false,
    frequency: false,
    cores: true,
    ram: true,
    tp: true,
    mp: true,
};

function buildCostTable(statName) {
    const tiers = COSTS[statName];
    let html = `<table class="cost-table" data-stat="${statName}">
        <thead><tr><th>${t('cost_threshold')}</th><th>${t('cost_cost')}</th><th>${t('cost_bonus')}</th></tr></thead>
        <tbody>`;
    for (const tier of tiers) {
        html += `<tr><td>${tier.step}+</td><td>${tier.capital} ${t('cost_cap')}</td><td>+${tier.sup}</td></tr>`;
    }
    html += `</tbody></table>`;
    return html;
}

function buildTierIndicators(statName) {
    const tiers = COSTS[statName];
    let html = `<div class="tier-indicators color-${statName}" data-stat="${statName}">`;
    for (let i = 0; i < tiers.length; i++) {
        const tier = tiers[i];
        const nextStep = (i + 1 < tiers.length) ? tiers[i + 1].step : '';
        const range = nextStep ? `${tier.step}-${nextStep - 1}` : `${tier.step}+`;
        const title = `${range}: ${tier.capital} cap → +${tier.sup}`;
        const dotActive = i === 0 ? ' active' : '';
        html += `<span class="tier-dot${dotActive}" title="${tier.step}"></span>`;
        html += `<span class="tier-indicator" title="${title}">${tier.capital}:${tier.sup}</span>`;
    }
    html += `</div>`;
    return html;
}

function buildStatCell(statName) {
    const label = getStatLabels()[statName];
    const tier = getCurrentTier(statName, 0);

    return `<td>
        <div class="stat-header">
            <span class="stat-label color-${statName}"><img src="public/image/charac/${statName}.png" alt="" class="stat-icon"> ${label}</span>
            ${STAT_LITE[statName] ? '' : buildTierIndicators(statName)}
            <span class="stat-value color-${statName}" data-stat="${statName}">0</span>
        </div>
        <div class="stat-buttons" data-stat="${statName}">
            ${STAT_LITE[statName]?'':'<button data-delta=\"-100\">-100</button>'}
            <button data-delta="-10">-10</button>
            <button data-delta="-1">-1</button>
            <button data-delta="1">+1</button>
            <button data-delta="10">+10</button>
            ${STAT_LITE[statName]?'':'<button data-delta=\"100\">100</button>'}
        </div>
        <div class="stat-cost-info">
            <span class="stat-cost-label">${t('cost_next')}</span>
            <span class="stat-cost-current">${tier.capital} ${t('cost_cap')} → +${tier.sup}</span>
        </div>
        ${buildCostTable(statName)}
    </td>`;
}

function generateStatsTable() {
    let html = '<table class="stats-table"><tbody>';
    for (const [left, right] of STAT_PAIRS) {
        html += `<tr>${buildStatCell(left)}${buildStatCell(right)}</tr>`;
    }
    html += '</tbody></table>';
    return html;
}

export function initStatsTab(leek) {
    console.log('[stats-tab] initStatsTab called, COSTS:', COSTS);

    // Register observers first so they work even if DOM setup fails
    leek.on('level', () => {
        console.log('[stats-tab] level event received');
        updateStatsTab(leek);
    });

    const statsPanel = document.getElementById('stats');
    console.log('[stats-tab] statsPanel:', statsPanel);

    // Replace the static table with dynamically generated content
    const tableContainer = statsPanel.querySelector('.stats-table');
    console.log('[stats-tab] tableContainer found:', tableContainer);

    if (tableContainer) {
        const generatedHTML = generateStatsTable();
        console.log('[stats-tab] generated HTML length:', generatedHTML.length);
        const wrapper = document.createElement('div');
        wrapper.innerHTML = generatedHTML;
        console.log('[stats-tab] wrapper.firstElementChild:', wrapper.firstElementChild);
        tableContainer.replaceWith(wrapper.firstElementChild);
    }

    // Initialize toggle button for cost tables
    const toggleBtn = document.getElementById('toggle-cost-tables');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            statsPanel.classList.toggle('show-cost-tables');
            toggleBtn.classList.toggle('active');
        });
    }

    // Initialize capital display
    updateCapitalDisplay(leek);

    // Initialize stat value displays
    const valueDisplays = statsPanel.querySelectorAll('.stat-value');
    console.log('[stats-tab] valueDisplays found:', valueDisplays.length);
    valueDisplays.forEach((el, i) => {
        try {
            const statName = el.dataset.stat;
            console.log('[stats-tab] valueDisplay', i, statName);
            el.textContent = leek.bonusStats[statName] || 0;
            highlightCurrentTier(statName, leek.bonusStats[statName] || 0);
        } catch (e) {
            console.error('[stats-tab] error in valueDisplay', i, e);
        }
    });

    // Initialize button controls within statsPanel
    const buttonGroups = statsPanel.querySelectorAll('.stat-buttons');
    console.log('[stats-tab] buttonGroups found:', buttonGroups.length);

    buttonGroups.forEach(group => {
        const statName = group.dataset.stat;
        const buttons = group.querySelectorAll('button');
        console.log('[stats-tab] buttons for', statName, ':', buttons.length);

        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const delta = parseInt(button.dataset.delta, 10);
                const currentBonus = leek.bonusStats[statName] || 0;
                console.log('[stats-tab] button click:', statName, 'delta:', delta, 'currentBonus:', currentBonus);

                let newValue;
                if (delta > 0) {
                    newValue = addAtLeast(statName, currentBonus, delta);
                } else {
                    newValue = removeAtLeast(statName, currentBonus, Math.abs(delta));
                }

                console.log('[stats-tab] newValue:', newValue);
                leek.bonusStats[statName] = newValue;
                updateStatDisplay(statName, leek);
            });
        });
    });

    console.log('[stats-tab] initStatsTab complete');
}

export function updateStatsTab(leek) {
    const statsPanel = document.getElementById('stats');
    if (!statsPanel) return;

    const valueDisplays = statsPanel.querySelectorAll('.stat-value');
    valueDisplays.forEach(el => {
        const statName = el.dataset.stat;
        const bonus = leek.bonusStats[statName] || 0;
        el.textContent = bonus;
        highlightCurrentTier(statName, bonus);
        updateInvestedState(statName, bonus);
    });

    updateCapitalDisplay(leek);
}
