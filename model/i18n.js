const translations = {};
let currentLang = 'fr';

/**
 * Load a translation namespace (e.g. 'ui', 'characteristic') for a language.
 */
async function loadNamespace(lang, ns) {
    const resp = await fetch(`i18n/${lang}/${ns}.json`);
    if (!resp.ok) return;
    const data = await resp.json();
    if (!translations[lang]) translations[lang] = {};
    translations[lang][ns] = data;
}

/**
 * Initialize i18n: detect language and load the ui namespace.
 * Returns a promise that resolves when translations are ready.
 */
export async function initI18n() {
    const saved = localStorage.getItem('doleek-lang');
    if (saved && (saved === 'en' || saved === 'fr')) {
        currentLang = saved;
    } else {
        const browserLang = navigator.language?.slice(0, 2);
        currentLang = browserLang === 'fr' ? 'fr' : 'en';
    }
    await loadNamespace(currentLang, 'ui');
}

/**
 * Get current language code.
 */
export function getLang() {
    return currentLang;
}

/**
 * Set language and reload translations.
 */
export async function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('doleek-lang', lang);
    if (!translations[lang]?.ui) {
        await loadNamespace(lang, 'ui');
    }
}

/**
 * Translate a key. Supports {placeholder} substitution.
 *   t('turn_n', { n: 3 }) → "Turn 3"
 * Falls back to the key itself if not found.
 */
export function t(key, params) {
    const ns = translations[currentLang]?.ui;
    let text = ns?.[key] ?? key;
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            text = text.replace(`{${k}}`, v);
        }
    }
    return text;
}
