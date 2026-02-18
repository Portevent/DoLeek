import Leek from './model/leek.js';
import { settings } from './model/settings.js';
import { initRecapStats } from './tabs/stats-recap.js';
import { initStatsTab } from './tabs/stats-tab.js';
import { initComponentsTab } from './tabs/components-tab.js';
import { initChipsTab } from './tabs/chips-tab.js';
import { initWeaponsTab } from './tabs/weapons-tab.js';
import { initComboTab } from './tabs/combo-tab.js';

// Global Leek instance for the application
const leek = new Leek('My Leek');

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initComputedToggle();
    initRangeToggle();
    initTabs();
    initResizer();
    initRecapStats(leek);
    initStatsTab(leek);
    initComponentsTab(leek);
    initChipsTab(leek);
    initWeaponsTab(leek);
    initComboTab(leek);
});

// Expose leek instance globally for debugging
window.leek = leek;

function initTheme() {
    const toggle = document.getElementById('theme-toggle');
    const saved = localStorage.getItem('doleek-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');

    applyTheme(theme);

    toggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        localStorage.setItem('doleek-theme', next);
    });
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const toggle = document.getElementById('theme-toggle');
    toggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function initComputedToggle() {
    const toggle = document.getElementById('computed-toggle');
    toggle.addEventListener('click', () => {
        settings.computedMode = !settings.computedMode;
        toggle.classList.toggle('active', settings.computedMode);
        leek.emit('computed');
    });
}

function initRangeToggle() {
    const toggle = document.getElementById('range-toggle');
    toggle.addEventListener('click', () => {
        settings.rangeMode = !settings.rangeMode;
        toggle.classList.toggle('active', settings.rangeMode);
        document.body.classList.toggle('show-range', settings.rangeMode);
    });
}

function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    const panels = document.querySelectorAll('.tab-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.dataset.tab;

            // Remove active class from all tabs and panels
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));

            // Add active class to clicked tab and corresponding panel
            tab.classList.add('active');
            document.getElementById(targetId).classList.add('active');
        });
    });
}

function initResizer() {
    const resizer = document.getElementById('resizer');
    const recap = document.querySelector('.recap');
    const container = document.querySelector('.container');

    let isResizing = false;

    resizer.addEventListener('mousedown', (_) => {
        isResizing = true;
        resizer.classList.add('active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const containerRect = container.getBoundingClientRect();
        let newWidth = e.clientX - containerRect.left;

        // Constrain width within min/max bounds
        const minWidth = 150;
        const maxWidth = containerRect.width - 200 - resizer.offsetWidth;

        newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));

        recap.style.width = newWidth + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            resizer.classList.remove('active');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
}