/**
 * ==========================================================
 *  /PURGE - Kanalda toplu mesaj siler
 * ==========================================================
 */

const { SlashCommandBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const { success, error } = require('../../utils/embed');
const { requirePermission } = require('../../services/permissionService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Belirtilen kanaldan toplu mesaj siler.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages)
        .addIntegerOption((opt) =>
            opt
                .setName('adet')
                .setDescription('Silinecek mesaj sayısı (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        )
        .addChannelOption((opt) => opt.setName('kanal').setDescription('Mesajların silineceği kanal')),

    async execute(interaction, client) {
        const amount = interaction.options.getInteger('adet');
        const channel = interaction.options.getChannel('kanal') || interaction.channel;

        const permErr = requirePermission(interaction.member, PermissionsBitField.Flags.ManageMessages, 'Mesajları Yönet');
        if (permErr) return interaction.reply({ embeds: [error('Yetki Hatası', permErr)], ephemeral: true });

        if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) {
            return interaction.reply({ embeds: [error('Hata', 'Mesaj silme yalnızca metin kanallarında çalışır.')], ephemeral: true });
        }

        await interaction.deferReply();

        try {
            const deleted = await channel.bulkDelete(amount, true);
            await interaction.editReply({
                embeds: [
                    success('Mesajlar Silindi', `<#${channel.id}> kanalında **${deleted.size}** mesaj silindi.`),
                ],
            });
        } catch (err) {
            await interaction.editReply({
                embeds: [error('Hata', `Mesajlar silinemedi: ${err.message}\n(14 günden eski mesajlar veya izin sorunu olabilir.)`)],
            });
        }
    },
};