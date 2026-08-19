/**
 * ==========================================================
 *  GUILD MEMBER ADD EVENT
 * ----------------------------------------------------------
 *  Yeni üye katılınca:
 *  1) Anti-raid kontrolü (guardService)
 *  2) Otomatik rol (autorole)
 *  3) Hoş geldin mesajı (sunucu ayarlarından)
 *  4) İstatistik sayaçlarının güncellenmesi
 * ==========================================================
 */

const { Events, EmbedBuilder } = require('discord.js');
const { handleJoin } = require('../services/guardService');
const { updateCounters } = require('../services/statsService');
const { getGuild } = require('../utils/guild');
const { logger } = require('../utils/logger');

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,

    /**
     * @param {import('discord.js').Client} client
     * @param {import('discord.js').GuildMember} member
     */
    async run(client, member) {
        const guild = member.guild;

        // --- Guard: anti-raid kontrolü ---
        const guard = await handleJoin(client, guild, member).catch(() => ({ blocked: false }));
        if (guard.blocked) return; // şüpheli üye uzaklaştırıldı

        try {
            const doc = await getGuild(guild.id);
            const cfg = client.config;

            // --- Otomatik rol ---
            if (doc.welcomeRoleId) {
                const role = guild.roles.cache.get(doc.welcomeRoleId);
                if (
                    role &&
                    guild.members.me.roles.highest.comparePositionTo(role) > 0 &&
                    !member.user.bot
                ) {
                    await member.roles.add(role).catch(() => {});
                }
            }

            // --- Hoş geldin mesajı ---
            if (doc.welcomeEnabled && doc.welcomeChannelId) {
                const channel = guild.channels.cache.get(doc.welcomeChannelId);
                if (channel && channel.isTextBased()) {
                    const template = doc.welcomeMessage || cfg.welcome.joinMessage;
                    const description = template
                        .replaceAll('{user}', `<@${member.id}>`)
                        .replaceAll('{memberCount}', guild.memberCount)
                        .replaceAll('{server}', guild.name);

                    const embed = new EmbedBuilder()
                        .setAuthor({ name: `${cfg.emoji.welcome} ${cfg.welcome.joinTitle}` })
                        .setDescription(description)
                        .setColor(cfg.embeds.defaultColor)
                        .setThumbnail(member.user.displayAvatarURL({ extension: 'png', size: 256 }))
                        .setFooter({ text: cfg.embeds.footerText })
                        .setTimestamp();

                    await channel.send({ embeds: [embed] }).catch(() => {});
                }
            }
        } catch (error) {
            logger.error(`guildMemberAdd hatası (${guild.name}): ${error.message}`);
        }

        // --- İstatistik sayaçlarını güncelle ---
        await updateCounters(client, guild).catch(() => {});
    },
};