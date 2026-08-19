/**
 * ==========================================================
 *  /STATS - Sunucu istatistik sayaçları (ses kanalları)
 *  Alt komutlar: olustur | kaldir
 * ==========================================================
 */

const { SlashCommandBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const { success, error } = require('../../utils/embed');
const { requirePermission } = require('../../services/permissionService');
const { updateCounters } = require('../../services/statsService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Üye/bot/çevrimiçi istatistik sayaçlarını yönetir.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
        .addSubcommand((sub) => sub.setName('olustur').setDescription('Sayaç kanallarını oluşturur/günceller'))
        .addSubcommand((sub) => sub.setName('kaldir').setDescription('Sayaç kanallarını ve kategorisini siler')),

    async execute(interaction, client) {
        const permErr = requirePermission(interaction.member, PermissionsBitField.Flags.ManageGuild, 'Sunucuyu Yönet');
        if (permErr) return interaction.reply({ embeds: [error('Yetki Hatası', permErr)], ephemeral: true });

        const sub = interaction.options.getSubcommand();
        const cfg = client.config.stats;

        if (sub === 'olustur') {
            await interaction.deferReply();
            await updateCounters(client, interaction.guild);
            return interaction.editReply({
                embeds: [success('Sayaçlar Oluşturuldu', 'İstatistik sayaç kanalları hazır ve otomatik güncellenir.')],
            });
        }

        const category = interaction.guild.channels.cache.find(
            (c) => c.type === ChannelType.GuildCategory && c.name === cfg.categoryName
        );

        if (!category) {
            return interaction.reply({ embeds: [error('Hata', 'İstatistik kategorisi bulunamadı.')], ephemeral: true });
        }

        let deleted = 0;
        const counterNames = Object.values(cfg.counters).map((m) => m.name);

        for (const channel of interaction.guild.channels.cache.values()) {
            if (
                channel.type === ChannelType.GuildVoice &&
                channel.parentId === category.id &&
                counterNames.some((name) => channel.name.startsWith(name))
            ) {
                await channel.delete('İstatistik sayaçları kaldırıldı.').catch(() => {});
                deleted++;
            }
        }
        await category.delete('İstatistik kategorisi kaldırıldı.').catch(() => {});

        await interaction.reply({
            embeds: [success('Sayaçlar Kaldırıldı', `**${deleted}** sayaç kanalı ve kategori silindi.`)],
        });
    },
};