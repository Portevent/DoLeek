import Leek from './model/leek.js';
import { initRecapStats } from './tabs/stats-recap.js';
import { initStatsTab } from './tabs/stats-tab.js';
import { initComponentsTab } from './tabs/components-tab.js';
import { initChipsTab } from './tabs/chips-tab.js';

// Global Leek instance for the application
const leek = new Leek('My Leek');

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initResizer();
    initRecapStats(leek);
    initStatsTab(leek);
    initComponentsTab(leek);
    initChipsTab(leek);
});

// Expose leek instance globally for debugging
window.leek = leek;

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

    resizer.addEventListener('mousedown', (e) => {
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