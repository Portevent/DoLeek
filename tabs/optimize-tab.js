// Optimize tab: finds component swap opportunities that free capital
// while keeping user-selected stats at their current levels.

import { COMPONENTS } from '../data/components.js';
import { COSTS } from '../model/stats.js';
import { t } from '../model/i18n.js';

const STAT_NAMES = [
    'life', 'strength', 'wisdom', 'resistance', 'agility', 'science',
    'magic', 'frequency', 'cores', 'ram', 'tp', 'mp',
];

// Compute total capital spent for a given bonus stat value (duplicated from stats-tab.js)
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

// Returns net capital impact of a delta on a stat (positive = freed, negative = cost)
function capitalForDelta(statName, currentBonus, delta) {
    if (delta > 0) {
        const reducedBonus = Math.max(0, currentBonus - delta);
        return computeStatCapital(statName, currentBonus) - computeStatCapital(statName, reducedBonus);
    } else if (delta < 0) {
        const increasedBonus = currentBonus + Math.abs(delta);
        return -(computeStatCapital(statName, increasedBonus) - computeStatCapital(statName, currentBonus));
    }
    return 0;
}

// Returns sorted array of swap suggestions with netCapital >= 0
function runOptimization(leek, keptStats) {
    if (leek.components.length === 0) return [];

    const equippedIds = new Set(leek.components.map(c => String(c.id)));
    const candidates = Object.values(COMPONENTS).filter(c => !equippedIds.has(String(c.id)));

    const results = [];

    for (let i = 0; i < leek.components.length; i++) {
        const equipped = leek.components[i];
        const equippedMap = new Map(equipped.stats);

        for (const candidate of candidates) {
            const candidateMap = new Map(candidate.stats);

            const delta = {};
            for (const stat of STAT_NAMES) {
                delta[stat] = (candidateMap.get(stat) || 0) - (equippedMap.get(stat) || 0);
            }

            let netCapital = 0;
            for (const stat of keptStats) {
                const currentBonus = leek.bonusStats[stat] || 0;
                netCapital += capitalForDelta(stat, currentBonus, delta[stat]);
            }

            if (netCapital >= 0) {
                results.push({ candidate, equippedIndex: i, equipped, delta, netCapital });
            }
        }
    }

    results.sort((a, b) => b.netCapital - a.netCapital);
    return results;
}

function buildDeltaHtml(delta, keptStats) {
    const keptSet = new Set(keptStats);
    return STAT_NAMES
        .filter(stat => delta[stat] !== 0)
        .map(stat => {
            const val = delta[stat];
            const sign = val > 0 ? '+' : '';
            const cls = val > 0 ? 'delta-positive' : 'delta-negative';
            const infoCls = keptSet.has(stat) ? '' : ' delta-info';
            return `<span class="optimize-delta ${cls}${infoCls} color-${stat}">
                <img src="public/image/charac/${stat}.png" alt="${stat}">
                ${sign}${val}
            </span>`;
        }).join('');
}

function renderResults(results, leek, keptStats, container) {
    if (results.length === 0) {
        container.innerHTML = `<p class="optimize-message">${t('optimize_no_results')}</p>`;
        return;
    }

    const count = t('optimize_result_count').replace('{n}', results.length);
    let html = `<p class="optimize-count">${count}</p>`;

    for (let idx = 0; idx < results.length; idx++) {
        const { candidate, equipped, delta, netCapital } = results[idx];
        const equippedName = equipped.name.replace(/_/g, ' ');
        const candidateName = candidate.name.replace(/_/g, ' ');
        const sign = netCapital > 0 ? '+' : '';
        const badgeCls = netCapital > 0 ? 'badge-positive' : 'badge-zero';

        html += `<div class="optimize-result-card">
            <div class="optimize-result-header">
                <div class="optimize-component-names">
                    <div class="optimize-component-icon">
                        <img src="public/image/component/${equipped.name}.png" alt="${equippedName}">
                    </div>
                    <span class="optimize-equipped-name">${equippedName}</span>
                    <span class="optimize-arrow">→</span>
                    <div class="optimize-component-icon">
                        <img src="public/image/component/${candidate.name}.png" alt="${candidateName}">
                    </div>
                    <span class="optimize-candidate-name">${candidateName}</span>
                </div>
                <div class="optimize-result-actions">
                    <span class="optimize-badge ${badgeCls}">${sign}${netCapital} ${t('cost_cap')}</span>
                    <button class="optimize-apply-btn" data-result-idx="${idx}">${t('optimize_apply')}</button>
                </div>
            </div>
            <div class="optimize-deltas">${buildDeltaHtml(delta, keptStats)}</div>
        </div>`;
    }

    container.innerHTML = html;

    container.querySelectorAll('.optimize-apply-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.resultIdx, 10);
            const result = results[idx];
            if (!result) return;
            leek.removeComponent(result.equippedIndex);
            leek.addComponent(result.candidate);
        });
    });
}

export function initOptimizeTab(leek) {
    const panel = document.getElementById('optimize');
    if (!panel) return;

    const togglesContainer = panel.querySelector('.optimize-stat-toggles');
    const runBtn = panel.querySelector('.optimize-run-btn');
    const resultsContainer = panel.querySelector('.optimize-results');

    // All stats kept by default
    const keptStats = new Set(STAT_NAMES);

    togglesContainer.innerHTML = STAT_NAMES.map(stat =>
        `<button class="optimize-stat-toggle active" data-stat="${stat}">
            <img src="public/image/charac/${stat}.png" alt="${stat}">
        </button>`
    ).join('');

    togglesContainer.addEventListener('click', e => {
        const btn = e.target.closest('.optimize-stat-toggle');
        if (!btn) return;
        const stat = btn.dataset.stat;
        if (keptStats.has(stat)) {
            keptStats.delete(stat);
            btn.classList.remove('active');
        } else {
            keptStats.add(stat);
            btn.classList.add('active');
        }
    });

    function clearResults() {
        resultsContainer.innerHTML = '';
    }

    runBtn.addEventListener('click', () => {
        if (leek.components.length === 0) {
            resultsContainer.innerHTML = `<p class="optimize-message">${t('optimize_no_components')}</p>`;
            return;
        }
        const results = runOptimization(leek, [...keptStats]);
        renderResults(results, leek, [...keptStats], resultsContainer);
    });

    // Invalidate stale results when components change
    leek.on('components', clearResults);
}
