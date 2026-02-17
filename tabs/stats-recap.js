// Updates the recap zone stats display with current leek stats

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

    // Observe model changes to update recap
    leek.on('stats', () => updateRecapStats(leek));
    leek.on('level', () => updateRecapStats(leek));

    // Initial update
    updateRecapStats(leek);
}
