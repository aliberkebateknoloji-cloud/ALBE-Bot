/**
 * ==========================================================
 *  ZAMAN YARDIMCISI
 * ----------------------------------------------------------
 *  Süre çözümleme ("1d 2h 30m 45s") ve biçimlendirme işlemleri.
 * ==========================================================
 */

const dayjs = require('dayjs');
require('dayjs/locale/tr'); // Türkçe tarih biçimi
dayjs.locale('tr');

const UNIT_MS = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
};

/**
 * "1d 2h 30m", "5s", "2w" gibi süre metinlerini milisaniyeye çevirir.
 * @param {string} input
 * @returns {number|null} Geçersizse null döner
 */
function parseDuration(input) {
    if (!input) return null;

    const tokens = input.toLowerCase().match(/\d+\s?[smhdw]/g);
    if (!tokens) return null;

    let total = 0;
    for (const token of tokens) {
        const value = parseInt(token, 10);
        const unit = token.replace(/[^smhdw]/g, '');
        total += value * UNIT_MS[unit];
    }

    return total > 0 ? total : null;
}

/**
 * Milisaniyeyi insan okunur metne çevirir.
 * @param {number} ms
 * @returns {string} "1 gün 2 saat 30 dakika"
 */
function formatDuration(ms) {
    if (!ms || ms < 1000) return '0 saniye';

    const seconds = Math.floor(ms / 1000);
    const units = [
        { name: 'gün', value: Math.floor(seconds / 86_400) },
        { name: 'saat', value: Math.floor((seconds % 86_400) / 3_600) },
        { name: 'dakika', value: Math.floor((seconds % 3_600) / 60) },
        { name: 'saniye', value: seconds % 60 },
    ];

    return units
        .filter((u) => u.value > 0)
        .map((u) => `${u.value} ${u.name}`)
        .join(' ');
}

/** Tarihi "gg.AA.yyyy HH:mm:ss" biçiminde döndürür */
function formatDate(date) {
    return dayjs(date).format('DD.MM.YYYY HH:mm:ss');
}

/** Kısa tarih gösterimi ("14 Ağustos 2026") */
function formatDateLong(date) {
    return dayjs(date).format('DD MMMM YYYY');
}

module.exports = { parseDuration, formatDuration, formatDate, formatDateLong };