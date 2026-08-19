/**
 * ==========================================================
 *  /LOCKDOWN - Sunucu genelinde kilit
 * ----------------------------------------------------------
 *  Tüm metin/duyuru/ses kanallarının @everyone izinlerini
 *  kapatır. Eski izinler MongoDB'ye anlık görüntü olarak
 *  kaydedilir, /unlockdown ile geri yüklenir.
 * ==========================================================
 */

const { SlashCommandBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const { success, error } = require('../../utils/embed');
const { hasDatabase, getGuild } = require('../../utils/guild');
const { requirePermission } = require('../../services/permissionService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lockdown')
        .setDescription('Sunucu genelinde tüm kanalları kilitler (guard).')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
        .addStringOption((opt) => opt.setName('sebep').setDescription('Kilitlenme sebebi')),

    async execute(interaction, client) {
        if (!hasDatabase(client)) {
            return interaction.reply({ embeds: [error('Veritabanı Gerekli', 'Bu komut için MongoDB bağlantısı gerekli.')], ephemeral: true });
        }

        const reason = interaction.options.getString('sebep') || 'Sunucu genelinde kilit.';

        const permErr = requirePermission(interaction.member, PermissionsBitField.Flags.ManageChannels, 'Kanalları Yönet');
        if (permErr) return interaction.reply({ embeds: [error('Yetki Hatası', permErr)], ephemeral: true });

        const doc = await getGuild(interaction.guildId);
        if (doc.lockdown.length > 0) {
            return interaction.reply({ embeds: [error('Hata', 'Sunucu zaten kilitli durumda. `/unlockdown` ile açabilirsin.')], ephemeral: true });
        }

        // Kilitlenecek kanal türleri
        const lockable = interaction.guild.channels.cache.filter((c) =>
            [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice].includes(c.type)
        );

        await interaction.deferReply();

        // Anlık görüntüyü kaydet
        const snapshot = [];
        for (const channel of lockable.values()) {
            const everyoneOverride = channel.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id);
            snapshot.push({
                channelId: channel.id,
                allow: everyoneOverride?.allow.bitfield ?? 0,
                deny: everyoneOverride?.deny.bitfield ?? 0,
            });
        }
        doc.lockdown = snapshot;
        await doc.save();

        // Tüm kanalları kilitle
        for (const channel of lockable.values()) {
            if (channel.type === ChannelType.GuildVoice) {
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, { Connect: false }).catch(() => {});
            } else {
                await channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, { SendMessages: false }).catch(() => {});
            }
        }

        await interaction.editReply({
            embeds: [
                success('Sunucu Kilitlendi', `**${lockable.size}** kanal kilitlendi.`).addFields({
                    name: 'Sebep',
                    value: reason,
                }),
            ],
        });
    },
};