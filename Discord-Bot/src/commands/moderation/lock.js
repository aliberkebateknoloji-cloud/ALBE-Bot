/**
 * ==========================================================
 *  /LOCK - Kanalı kilitler (üyeler mesaj gönderemez)
 * ==========================================================
 */

const { SlashCommandBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const { success, error } = require('../../utils/embed');
const { requirePermission } = require('../../services/permissionService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Belirtilen kanalı kilitler.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
        .addChannelOption((opt) => opt.setName('kanal').setDescription('Kilitlenecek kanal'))
        .addStringOption((opt) => opt.setName('sebep').setDescription('Kilitlenme sebebi')),

    async execute(interaction, client) {
        const channel = interaction.options.getChannel('kanal') || interaction.channel;
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi.';

        const permErr = requirePermission(interaction.member, PermissionsBitField.Flags.ManageChannels, 'Kanalları Yönet');
        if (permErr) return interaction.reply({ embeds: [error('Yetki Hatası', permErr)], ephemeral: true });

        const everyone = interaction.guild.roles.everyone;

        try {
            // Metin kanalı -> mesaj yazmayı kapat; ses kanalı -> bağlanmayı kapat
            if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement) {
                await channel.permissionOverwrites.edit(everyone.id, { SendMessages: false });
            } else if (channel.type === ChannelType.GuildVoice) {
                await channel.permissionOverwrites.edit(everyone.id, { Connect: false });
            } else {
                return interaction.reply({ embeds: [error('Hata', 'Bu kanal türü kilitlenemez.')], ephemeral: true });
            }

            await interaction.reply({
                embeds: [
                    success('Kanal Kilitlendi', `<#${channel.id}> kanalı kilitlendi.`).addFields({
                        name: 'Sebep',
                        value: reason,
                    }),
                ],
            });
        } catch (err) {
            await interaction.reply({ embeds: [error('Hata', `Kilitleme başarısız: ${err.message}`)], ephemeral: true });
        }
    },
};