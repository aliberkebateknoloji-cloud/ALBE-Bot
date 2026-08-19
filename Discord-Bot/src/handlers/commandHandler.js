/**
 * ==========================================================
 *  KOMUT HANDLER
 * ----------------------------------------------------------
 *  src/commands altındaki TÜM klasörleri (kategorileri) tarar
 *  ve her komutu client.commands (Collection) koleksiyonuna yükler.
 * ==========================================================
 */

const { readdirSync } = require('node:fs');
const { join } = require('node:path');
const { Collection } = require('discord.js');
const { logger } = require('../utils/logger');

/**
 * Komutları yükler.
 * @param {import('discord.js').Client} client
 */
function commandHandler(client) {
    client.commands = new Collection();

    const commandsPath = join(__dirname, '..', 'commands');
    const categories = readdirSync(commandsPath);

    for (const category of categories) {
        const categoryPath = join(commandsPath, category);
        const commandFiles = readdirSync(categoryPath).filter((file) => file.endsWith('.js'));

        for (const file of commandFiles) {
            const command = require(join(categoryPath, file));

            // Geçerli bir komut şablonu kontrolü
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, { ...command, category });
                logger.info(`Komut yüklendi: /${command.data.name} (${category})`);
            } else {
                logger.warn(`Komut yüklenemedi (eksik "data"/"execute"): ${file}`);
            }
        }
    }

    logger.success(`Toplam ${client.commands.size} komut hazır.`);
}

module.exports = { commandHandler };