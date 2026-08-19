/**
 * ==========================================================
 *  /UNLOCKDOWN - Sunucu genelindeki kilidi kaldırır
 * ----------------------------------------------------------
 *  /lockdown sırasında MongoDB'ye kaydedilen eski @everyone
 *  izinlerini geri yükler.
 * ==========================================================
 */

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { success, error } = require('../../utils/embed');
const { hasDatabase, getGuild } = require('../../utils/guild');
const { requirePermission } = require('../../services/permissionService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlockdown')
        .setDescription('Sunucu genelindeki kilidi kaldırır (guard).')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels),

    async execute(interaction, client) {
        if (!hasDatabase(client)) {
            return interaction.reply({ embeds: [error('Veritabanı Gerekli', 'Bu komut için MongoDB bağlantısı gerekli.')], ephemeral: true });
        }

        const permErr = requirePermission(interaction.member, PermissionsBitField.Flags.ManageChannels, 'Kanalları Yönet');
        if (permErr) return interaction.reply({ embeds: [error('Yetki Hatası', permErr)], ephemeral: true });

        const doc = await getGuild(interaction.guildId);
        if (doc.lockdown.length === 0) {
            return interaction.reply({ embeds: [error('Hata', 'Sunucu şu anda kilitli değil.')], ephemeral: true });
        }

        await interaction.deferReply();

        // Anlık görüntüyü geri yükle
        let restored = 0;
        for (const entry of doc.lockdown) {
            const channel = interaction.guild.channels.cache.get(entry.channelId);
            if (!channel) continue;

            const everyoneId = interaction.guild.roles.everyone.id;

            if (entry.allow === 0 && entry.deny === 0) {
                // Özel izin yoktu -> override'ı sil
                await channel.permissionOverwrites.delete(everyoneId).catch(() => {});
            } else {
                // Eski izinleri geri yükle
                await channel.permissionOverwrites.edit(everyoneId, {
                    allow: entry.allow,
                    deny: entry.deny,
                }).catch(() => {});
            }
            restored++;
        }

        // Anlık görüntüyü temizle
        doc.lockdown = [];
        await doc.save();

        await interaction.editReply({
            embeds: [success('Sunucu Kilidi Kaldırıldı', `**${restored}** kanalın eski izinleri geri yüklendi.`)],
        });
    },
};