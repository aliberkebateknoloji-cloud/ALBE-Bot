/**
 * ==========================================================
 *  READY EVENT
 * ----------------------------------------------------------
 *  Bot çevrimiçi olunca:
 *  - Durum / aktivite ayarlar
 *  - Slash komutlarını yükler (GUILD_ID tanımlıysa sunucuya,
 *    değilse global olarak)
 * ==========================================================
 */

const { Events, ActivityType } = require('discord.js');
const { logger } = require('../utils/logger');

module.exports = {
    name: Events.ClientReady,
    once: true,

    /**
     * @param {import('discord.js').Client} client
     */
    async run(client) {
        logger.success(`${client.user.tag} olarak giriş yapıldı!`);

        // Aktivite ve durum (config.json'dan)
        const activityTypes = {
            PLAYING: ActivityType.Playing,
            WATCHING: ActivityType.Watching,
            LISTENING: ActivityType.Listening,
            COMPETING: ActivityType.Competing,
        };
        client.user.setPresence({
            activities: [
                {
                    name: client.config.bot.activityText,
                    type: activityTypes[client.config.bot.activityType] || ActivityType.Watching,
                },
            ],
            status: client.config.bot.status,
        });

        // Slash komutlarını kaydet
        const commands = [...client.commands.values()].map((c) => c.data.toJSON());
        const guildId = process.env.GUILD_ID;

        if (guildId) {
            const guild = client.guilds.cache.get(guildId);
            if (guild) {
                await guild.commands.set(commands);
                logger.success(`${commands.length} komut "${guild.name}" sunucusuna yüklendi.`);
            } else {
                logger.warn('GUILD_ID geçersiz; komutlar global olarak yüklenecek.');
                await client.application.commands.set(commands);
            }
        } else {
            await client.application.commands.set(commands);
            logger.success(`${commands.length} komut global olarak yüklendi.`);
        }
    },
};