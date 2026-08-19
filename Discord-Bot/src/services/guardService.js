/**
 * ==========================================================
 *  GUARD SERVİSİ - Anti-Raid / Anti-Bot
 * ----------------------------------------------------------
 *  Sunucuya 1 dakikalık pencerede limitin üzerinde üye
 *  katılırsa bot saldırı önlemi olarak üyeyi atar.
 * ==========================================================
 */

const { getGuild } = require('../utils/guild');
const { logger } = require('../utils/logger');

const WINDOW_MS = 60_000; // 1 dakikalık izleme penceresi

/**
 * Sunucuya katılan üyeleri inceler.
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').GuildMember} member
 * @returns {Promise<{ blocked: boolean, reason?: string }>}
 */
async function handleJoin(client, guild, member) {
    let doc;
    try {
        doc = await getGuild(guild.id);
    } catch {
        return { blocked: false }; // DB yoksa koruma kapalı say
    }

    const enabled = doc.antibotEnabled;
    const limit = doc.maxJoinsPerMinute || client.config.guard.maxJoinsPerMinute;

    if (!enabled) return { blocked: false };

    // Penceredeki katılımları topla
    const now = Date.now();
    const hits = (client.guardHits.get(guild.id) || []).filter((t) => now - t < WINDOW_MS);
    hits.push(now);
    client.guardHits.set(guild.id, hits);

    // Limit aşıldı mı?
    if (hits.length > limit) {
        logger.warn(`[GUARD] Anti-Raid tetiklendi: ${guild.name} (${guild.id}) -> ${member.user.tag}`);

        try {
            if (member.kickable) {
                await member.kick('Anti-Raid koruması: kısa sürede anormal katılım tespit edildi.');
            } else if (member.bannable) {
                await member.ban({ reason: 'Anti-Raid koruması: kısa sürede anormal katılım tespit edildi.' });
            }
        } catch (error) {
            logger.error(`[GUARD] Üye uzaklaştırma hatası: ${error.message}`);
        }

        return { blocked: true, reason: 'Katılım hız limiti aşıldı.' };
    }

    return { blocked: false };
}

module.exports = { handleJoin, WINDOW_MS };