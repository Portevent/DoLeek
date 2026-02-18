export const LAUNCH_TYPE_ICONS = {
    1: 'line',
    2: 'diagonal',
    3: 'star',
    4: 'inverted_star',
    7: 'circle',
};

export const AREA_LABELS = {
    1: 'Point',
    3: 'Circle 1',
    4: 'Circle 2',
    5: 'Circle 3',
    6: 'Plus 2',
    7: 'Plus 3',
    8: 'X 1',
    9: 'X 2',
    11: 'Square 1',
    12: 'Square 2',
    13: 'Point',
};

const LAUNCH_TYPE_LABELS = {
    1: 'Line',
    2: 'Diagonal',
    3: 'Star',
    4: 'Inverted star',
    7: 'Circle',
};

export function buildRangeHtml(item) {
    const launchIcon = LAUNCH_TYPE_ICONS[item.launch_type];
    const launchLabel = LAUNCH_TYPE_LABELS[item.launch_type];
    const rangeText = item.min_range === item.max_range
        ? `${item.max_range}`
        : `${item.min_range}-${item.max_range}`;
    const rangeTooltip = item.min_range === item.max_range
        ? `Range: ${item.max_range}`
        : `Range: ${item.min_range} to ${item.max_range}`;
    const areaLabel = AREA_LABELS[item.area];
    const showArea = areaLabel && item.area !== 1 && item.area !== 13;
    const losText = item.los ? ' (Line of sight)' : '';

    return `<div class="item-range" title="${rangeTooltip}${losText}">
        ${launchIcon ? `<img class="launch-type-icon" src="public/image/launch_type/${launchIcon}.png" alt="${launchIcon}" title="Launch type: ${launchLabel}">` : ''}
        <span class="range-text">${rangeText}</span>
        ${showArea ? `<span class="area-text" title="Area of effect: ${areaLabel}">${areaLabel}</span>` : ''}
    </div>`;
}
