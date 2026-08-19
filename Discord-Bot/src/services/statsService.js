/**
 * ==========================================================
 *  STATS SERVİSİ - Sunucu İstatistik Sayaçları
 * ----------------------------------------------------------
 *  Toplam Üye / Botlar / Çevrimiçi sayaçlarını ses kanalları
 *  olarak yönetir. Kolon adları config.json'dan gelir.
 * ==========================================================
 */

const { ChannelType, PermissionsBitField } = require('discord.js');
const { logger } = require('../utils/logger');

/**
 * İstatistik sayaç kanallarını oluşturur veya günceller.
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').Guild} guild
 */
async function updateCounters(client, guild) {
    const cfg = client.config.stats;

    // İstatistik kategorisi yoksa oluştur
    let category = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && c.name === cfg.categoryName
    );
    if (!category) {
        try {
            category = await guild.channels.create({
                name: cfg.categoryName,
                type: ChannelType.GuildCategory,
            });
        } catch {
            logger.warn(`İstatistik kategorisi oluşturulamadı (${guild.name}).`);
            return;
        }
    }

    // Değerleri hesapla
    const memberCache = guild.members.cache;
    const bots = memberCache.filter((m) => m.user.bot).size;
    const online = memberCache.filter((m) => m.presence?.status && m.presence.status !== 'offline').size;
    const values = {
        members: guild.memberCount,
        users: guild.memberCount - bots,
        bots,
        online,
    };

    for (const [key, meta] of Object.entries(cfg.counters)) {
        const channelName = `${meta.name}: ${values[key]}`;

        // Önce son isimle, sonra base isimle ara (ilk kurulum desteği)
        let channel = guild.channels.cache.find(
            (c) => c.type === ChannelType.GuildVoice && c.name === channelName
        );
        if (!channel) {
            channel = guild.channels.cache.find(
                (c) => c.type === ChannelType.GuildVoice && c.name === meta.name
            );
        }

        try {
            if (!channel) {
                channel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildVoice,
                    parent: category.id,
                    permissionOverwrites: [
                        {
                            id: guild.roles.everyone.id,
                            deny: [PermissionsBitField.Flags.Connect],
                        },
                    ],
                });
            } else if (channel.name !== channelName) {
                await channel.setName(channelName);
            }
        } catch (error) {
            logger.error(`İstatistik sayacı güncellenemedi (${meta.name}): ${error.message}`);
        }
    }
}

module.exports = { updateCounters };