/**
 * ==========================================================
 *  EVENT HANDLER
 * ----------------------------------------------------------
 *  src/events altındaki tüm event dosyalarını yükler.
 *  Her event dosyası { name, once, run } şablonuna uyar.
 * ==========================================================
 */

const { readdirSync } = require('node:fs');
const { join } = require('node:path');
const { logger } = require('../utils/logger');

/**
 * Eventleri yükler.
 * @param {import('discord.js').Client} client
 */
function eventHandler(client) {
    const eventsPath = join(__dirname, '..', 'events');
    const eventFiles = readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

    for (const file of eventFiles) {
        const event = require(join(eventsPath, file));

        // Geçerli event şablonu kontrolü: { name, run }
        if ('name' in event && typeof event.run === 'function') {
            if (event.once) {
                client.once(event.name, (...args) => event.run(client, ...args));
            } else {
                client.on(event.name, (...args) => event.run(client, ...args));
            }
            logger.info(`Event hazır: ${event.name}`);
        } else {
            logger.warn(`Event yüklenemedi (eksik "name"/"run"): ${file}`);
        }
    }
}

module.exports = { eventHandler };