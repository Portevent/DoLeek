import { exportBuild, importBuild } from './export-tab.js';
import { t } from '../model/i18n.js';

const STORAGE_KEY = 'doleek-leeks';
const ACTIVE_KEY = 'doleek-active-leek';

let leekSaves = [];
let activeIndex = 0;

function getLevelFromBuild(build) {
    if (!build) return 301;
    try {
        return JSON.parse(atob(build)).l || 301;
    } catch { return 301; }
}

function leekImageSrc(level) {
    return 'public/image/leek/leek' + (1 + Math.floor(level / 32)) + '_front_green.png';
}

function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leekSaves));
    localStorage.setItem(ACTIVE_KEY, String(activeIndex));
}

function updateActiveLeekName() {
    const el = document.querySelector('.active-leek-name');
    if (el) el.textContent = leekSaves[activeIndex]?.name || '';
}

function renderModal() {
    const list = document.querySelector('.leek-manager-list');
    if (!list) return;
    const onlyOne = leekSaves.length <= 1;
    list.innerHTML = leekSaves.map((save, i) => {
        const level = getLevelFromBuild(save.build);
        const imgSrc = leekImageSrc(level);
        const isActive = i === activeIndex;
        return `<div class="leek-list-item${isActive ? ' active' : ''}" data-index="${i}">
            <img src="${imgSrc}" alt="" class="leek-list-img">
            <input class="leek-name-input" data-index="${i}" value="${save.name.replace(/"/g, '&quot;')}" type="text" maxlength="30">
            <button class="leek-delete-btn" data-index="${i}" title="${t('leek_delete')}"${onlyOne ? ' disabled' : ''}>×</button>
        </div>`;
    }).join('');
}

function resetLeek(leek) {
    leek.setType(1);
    leek.setLevel(301);
    leek.bonusStats.reset();
    leek.emit('stats');
    while (leek.components.length > 0) leek.removeComponent(0);
    while (leek.chips.length > 0) leek.removeChip(0);
    while (leek.weapons.length > 0) leek.removeWeapon(0);
    leek.clearCombo();
}

function switchTo(idx, leek) {
    if (idx === activeIndex) return;
    leekSaves[activeIndex].build = exportBuild(leek);
    activeIndex = idx;
    const save = leekSaves[activeIndex];
    if (save.build) {
        importBuild(save.build, leek);
    } else {
        resetLeek(leek);
    }
    updateActiveLeekName();
    saveToStorage();
}

export function initLeekManager(leek) {
    // Load from localStorage
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const saved = raw ? JSON.parse(raw) : [];
        if (Array.isArray(saved) && saved.length > 0) {
            leekSaves = saved.map(s => ({
                name: String(s.name || t('leek_default_name')),
                build: s.build || null
            }));
            activeIndex = Math.min(
                Math.max(0, parseInt(localStorage.getItem(ACTIVE_KEY) || '0', 10)),
                leekSaves.length - 1
            );
            if (leekSaves[activeIndex].build) {
                importBuild(leekSaves[activeIndex].build, leek);
            }
        } else {
            leekSaves = [{ name: t('leek_default_name') + ' 1', build: null }];
            activeIndex = 0;
        }
    } catch {
        leekSaves = [{ name: t('leek_default_name') + ' 1', build: null }];
        activeIndex = 0;
    }

    updateActiveLeekName();

    // Auto-save current leek on any change
    const EVENTS = ['stats', 'level', 'components', 'chips', 'weapons', 'combo'];
    for (const event of EVENTS) {
        leek.on(event, () => {
            leekSaves[activeIndex].build = exportBuild(leek);
            saveToStorage();
        });
    }

    const modal = document.getElementById('leek-modal');
    const overlay = document.getElementById('leek-modal-overlay');
    const leekCenter = document.querySelector('.leek-center');
    const list = document.querySelector('.leek-manager-list');
    const addBtn = document.querySelector('.leek-add-btn');
    const closeBtn = document.querySelector('.leek-modal-close');

    function openModal() {
        leekSaves[activeIndex].build = exportBuild(leek);
        renderModal();
        modal.classList.add('open');
        overlay.classList.add('open');
    }

    function closeModal() {
        modal.classList.remove('open');
        overlay.classList.remove('open');
    }

    leekCenter.addEventListener('click', openModal);
    overlay.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    list.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.leek-delete-btn');
        if (deleteBtn) {
            const idx = parseInt(deleteBtn.dataset.index, 10);
            if (leekSaves.length <= 1) return;
            const deletingActive = (idx === activeIndex);
            leekSaves.splice(idx, 1);
            if (idx < activeIndex) {
                activeIndex--;
            } else if (deletingActive) {
                activeIndex = Math.min(activeIndex, leekSaves.length - 1);
                const save = leekSaves[activeIndex];
                if (save.build) {
                    importBuild(save.build, leek);
                } else {
                    resetLeek(leek);
                }
                updateActiveLeekName();
            }
            saveToStorage();
            renderModal();
            return;
        }

        const item = e.target.closest('.leek-list-item');
        if (item && !e.target.closest('.leek-name-input')) {
            const idx = parseInt(item.dataset.index, 10);
            if (idx !== activeIndex) {
                switchTo(idx, leek);
                renderModal();
                closeModal();
            }
        }
    });

    list.addEventListener('input', (e) => {
        const input = e.target.closest('.leek-name-input');
        if (!input) return;
        const idx = parseInt(input.dataset.index, 10);
        leekSaves[idx].name = input.value;
        if (idx === activeIndex) updateActiveLeekName();
        saveToStorage();
    });

    addBtn.addEventListener('click', () => {
        leekSaves[activeIndex].build = exportBuild(leek);
        const newName = t('leek_default_name') + ' ' + (leekSaves.length + 1);
        leekSaves.push({ name: newName, build: null });
        activeIndex = leekSaves.length - 1;
        resetLeek(leek);
        updateActiveLeekName();
        saveToStorage();
        renderModal();
    });
}
