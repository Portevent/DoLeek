import { COMPONENTS } from '../data/components.js';
import { CHIPS } from '../data/chips.js';
import { WEAPONS } from '../data/weapons.js';
import { t } from '../model/i18n.js';

const STAT_KEYS = ['life', 'strength', 'wisdom', 'resistance', 'agility', 'science', 'magic', 'frequency', 'cores', 'ram', 'tp', 'mp'];

export function exportBuild(leek) {
    const data = {
        l: leek.level,
        s: STAT_KEYS.map(k => leek.bonusStats[k]),
        co: leek.components.map(c => c.id),
        ch: leek.chips.map(c => c.id),
        w: leek.weapons.map(w => w.id),
        cb: leek.combo.map((turn, t) => turn.map((item, i) => ({
            id: item.id,
            type: item.item !== undefined ? 'w' : 'c',
            ...(leek.comboCrits[t]?.[i] ? { cr: 1 } : {})
        })))
    };
    return btoa(JSON.stringify(data));
}

export function importBuild(base64, leek) {
    let data;
    try {
        data = JSON.parse(atob(base64.trim()));
    } catch {
        throw new Error('Invalid build string: could not decode.');
    }

    // Validate level
    const level = Number(data.l);
    if (!Number.isInteger(level) || level < 1 || level > 301) {
        throw new Error('Invalid level value.');
    }

    // Validate bonus stats
    if (!Array.isArray(data.s) || data.s.length !== 12) {
        throw new Error('Invalid stats data.');
    }
    const statsObj = {};
    for (let i = 0; i < STAT_KEYS.length; i++) {
        const v = Number(data.s[i]);
        if (isNaN(v)) throw new Error(`Invalid stat value for ${STAT_KEYS[i]}.`);
        statsObj[STAT_KEYS[i]] = v;
    }

    // Validate components
    const components = (data.co || []).map(id => {
        const comp = COMPONENTS[String(id)];
        if (!comp) throw new Error(`Unknown component ID: ${id}`);
        return comp;
    });

    // Validate chips
    const chips = (data.ch || []).map(id => {
        const chip = CHIPS[String(id)];
        if (!chip) throw new Error(`Unknown chip ID: ${id}`);
        return chip;
    });

    // Validate weapons
    const weapons = (data.w || []).map(id => {
        const weapon = WEAPONS[String(id)];
        if (!weapon) throw new Error(`Unknown weapon ID: ${id}`);
        return weapon;
    });

    // Validate combo (backward compat: flat array → wrap in single turn)
    const rawCb = data.cb || [];
    const comboTurns = (rawCb.length > 0 && Array.isArray(rawCb[0])) ? rawCb : [rawCb];

    const resolvedTurns = comboTurns.map(turn => turn.map(entry => {
        let item;
        if (entry.type === 'w') {
            item = WEAPONS[String(entry.id)];
            if (!item) throw new Error(`Unknown weapon ID in combo: ${entry.id}`);
        } else {
            item = CHIPS[String(entry.id)];
            if (!item) throw new Error(`Unknown chip ID in combo: ${entry.id}`);
        }
        return { item, crit: !!entry.cr };
    }));

    // Apply to leek
    leek.setLevel(level);

    leek.bonusStats.setAll(statsObj);
    leek.emit('stats');

    // Clear and re-add components
    while (leek.components.length > 0) leek.removeComponent(0);
    for (const comp of components) leek.addComponent(comp);

    // Clear and re-add chips
    while (leek.chips.length > 0) leek.removeChip(0);
    for (const chip of chips) leek.addChip(chip);

    // Clear and re-add weapons
    while (leek.weapons.length > 0) leek.removeWeapon(0);
    for (const weapon of weapons) leek.addWeapon(weapon);

    // Clear and re-add combo turns
    leek.clearCombo();
    for (let t = 0; t < resolvedTurns.length; t++) {
        if (t > 0) leek.addTurn();
        for (let i = 0; i < resolvedTurns[t].length; i++) {
            const { item, crit } = resolvedTurns[t][i];
            leek.addComboItem(item, t);
            if (crit) leek.comboCrits[t][i] = true;
        }
    }
}

function fixLeekImageUrl(url) {
    // API returns malformed URLs like 'https:///static//image/...'
    // Extract the path from 'static/' onward and prepend the correct host.
    const match = url.match(/static\/.*/);
    return match ? `https://leekwars.com/${match[0]}` : url;
}

function initLeekSearch() {
    const input = document.querySelector('.search-leek-input');
    const resultsEl = document.querySelector('.search-leek-results');
    if (!input || !resultsEl) return;

    let debounceTimer = null;
    let currentController = null;

    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        if (currentController) {
            currentController.abort();
            currentController = null;
        }

        const query = input.value.trim();
        if (query.length < 2) {
            resultsEl.innerHTML = '';
            return;
        }

        resultsEl.innerHTML = `<p class="search-leek-status">${t('search_leek_searching')}</p>`;

        debounceTimer = setTimeout(async () => {
            currentController = new AbortController();
            try {
                const apiUrl = 'https://leekwars.com/api/ranking/search';
                const response = await fetch('https://corsproxy.io/?url=' + encodeURIComponent(apiUrl), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query, search_leeks: true, search_farmers: false, search_teams: false }),
                    signal: currentController.signal,
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const data = await response.json();
                const leeks = (data.results || []).filter(r => r.type === 'leek');

                if (leeks.length === 0) {
                    resultsEl.innerHTML = `<p class="search-leek-status">${t('search_leek_no_results')}</p>`;
                    return;
                }

                resultsEl.innerHTML = leeks.map(leek => {
                    const imgUrl = fixLeekImageUrl(leek.image || '');
                    return `<div class="search-leek-result">
                        <img class="search-leek-img" src="${imgUrl}" alt="" onerror="this.style.display='none'">
                        <div class="search-leek-info">
                            <span class="search-leek-name">${leek.name}</span>
                            <span class="search-leek-level">Lvl ${leek.level}</span>
                        </div>
                    </div>`;
                }).join('');
            } catch (e) {
                if (e.name === 'AbortError') return;
                resultsEl.innerHTML = `<p class="search-leek-status search-leek-error">${t('search_leek_error')}</p>`;
            } finally {
                currentController = null;
            }
        }, 400);
    });
}

export function initExportTab(leek) {
    const copyBtn = document.querySelector('.export-btn');
    const importBtn = document.querySelector('.import-btn');
    const exportArea = document.querySelector('.export-textarea');
    const importArea = document.querySelector('.import-textarea');
    const statusMsg = document.querySelector('.export-status');
    let importing = false;

    function showStatus(message, isError) {
        statusMsg.textContent = message;
        statusMsg.className = 'export-status ' + (isError ? 'error' : 'success');
        clearTimeout(statusMsg._timeout);
        statusMsg._timeout = setTimeout(() => {
            statusMsg.textContent = '';
            statusMsg.className = 'export-status';
        }, 4000);
    }

    function refresh() {
        if (importing) return;
        const str = exportBuild(leek);
        exportArea.value = str;
        history.replaceState(null, '', '#' + str);
    }

    // Keep export string and URL in sync with every change
    const events = ['stats', 'components', 'chips', 'weapons', 'combo', 'level'];
    for (const event of events) {
        leek.on(event, refresh);
    }

    // Initial sync
    refresh();

    // Copy URL button
    copyBtn.addEventListener('click', () => {
        exportArea.select();
        navigator.clipboard.writeText(window.location.href).then(() => {
            showStatus(t('export_copied'), false);
        }).catch(() => {
            showStatus(t('export_copy_fallback'), false);
        });
    });

    importBtn.addEventListener('click', () => {
        const value = importArea.value.trim();
        if (!value) {
            showStatus(t('import_empty'), true);
            return;
        }
        try {
            importing = true;
            importBuild(value, leek);
            importing = false;
            refresh();
            showStatus(t('import_success'), false);
        } catch (e) {
            importing = false;
            showStatus(e.message, true);
        }
    });

    initLeekSearch();
}
