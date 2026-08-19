/**
 * ==========================================================
 *  COMPONENT HANDLER (Buton / Menü)
 * ----------------------------------------------------------
 *  src/components altındaki tüm interaktif bileşen dosyalarını
 *  yükler. Her component, customId ile eşleştiği takdirde
 *  true döndürür; aksi halde false (sonraki component dener).
 * ==========================================================
 */

const { readdirSync } = require('node:fs');
const { join } = require('node:path');
const { logger } = require('../utils/logger');

/**
 * Interaktif bileşenleri yükler.
 * @param {import('discord.js').Client} client
 */
function componentHandler(client) {
    client.components = [];

    const componentsPath = join(__dirname, '..', 'components');
    const componentFiles = readdirSync(componentsPath).filter((file) => file.endsWith('.js'));

    for (const file of componentFiles) {
        const component = require(join(componentsPath, file));
        if (typeof component.run === 'function') {
            client.components.push(component);
            logger.info(`Component hazır: ${file}`);
        } else {
            logger.warn(`Component yüklenemedi (eksik "run"): ${file}`);
        }
    }

    logger.success(`Toplam ${client.components.length} component hazır.`);
}

module.exports = { componentHandler };