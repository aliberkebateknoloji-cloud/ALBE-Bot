/**
 * ==========================================================
 *  GUILD MEMBER REMOVE EVENT
 * ----------------------------------------------------------
 *  Üye ayrılınca görüşürüz mesajı gönderir ve istatistik
 *  sayaçlarını günceller.
 * ==========================================================
 */

const { Events, EmbedBuilder } = require('discord.js');
const { updateCounters } = require('../services/statsService');
const { getGuild } = require('../utils/guild');
const { logger } = require('../utils/logger');

module.exports = {
    name: Events.GuildMemberRemove,
    once: false,

    /**
     * @param {import('discord.js').Client} client
     * @param {import('discord.js').GuildMember} member
     */
    async run(client, member) {
        const guild = member.guild;

        try {
            const doc = await getGuild(guild.id);
            const cfg = client.config;

            // --- Görüşürüz mesajı ---
            if (doc.leaveEnabled && doc.leaveChannelId) {
                const channel = guild.channels.cache.get(doc.leaveChannelId);
                if (channel && channel.isTextBased()) {
                    const template = doc.leaveMessage || cfg.welcome.leaveMessage;
                    const description = template
                        .replaceAll('{user}', `<@${member.id}>`)
                        .replaceAll('{memberCount}', guild.memberCount)
                        .replaceAll('{server}', guild.name);

                    const embed = new EmbedBuilder()
                        .setAuthor({ name: cfg.welcome.leaveTitle })
                        .setDescription(description)
                        .setColor(cfg.embeds.infoColor)
                        .setThumbnail(member.user.displayAvatarURL({ extension: 'png', size: 256 }))
                        .setFooter({ text: cfg.embeds.footerText })
                        .setTimestamp();

                    await channel.send({ embeds: [embed] }).catch(() => {});
                }
            }
        } catch (error) {
            logger.error(`guildMemberRemove hatası (${guild.name}): ${error.message}`);
        }

        // --- İstatistik sayaçlarını güncelle ---
        await updateCounters(client, guild).catch(() => {});
    },
};