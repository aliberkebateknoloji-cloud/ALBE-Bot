/**
 * ==========================================================
 *  LOGGER - Renkli Konsol Günlüğü
 * ----------------------------------------------------------
 *  Windows PowerShell'de dahi çalışan ANSI renkleri kullanır.
 *  Tüm çıktılar zaman damgalıdır.
 * ==========================================================
 */

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
};

const timestamp = () => new Date().toLocaleString('tr-TR');

function print(color, level, message) {
    // eslint-disable-next-line no-console
    console.log(`${colors.cyan}[${timestamp()}]${colors.reset} ${color}[${level}]${colors.reset} ${message}`);
}

const logger = {
    info: (message) => print(colors.blue, 'BİLGİ', message),
    success: (message) => print(colors.green, 'BAŞARILI', message),
    warn: (message) => print(colors.yellow, 'UYARI', message),
    error: (message) => print(colors.red, 'HATA', message),
    debug: (message) => print(colors.magenta, 'DEBUG', message),
};

module.exports = { logger };