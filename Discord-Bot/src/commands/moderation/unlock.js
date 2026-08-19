/**
 * ==========================================================
 *  /UNLOCK - Kanalın kilidini açar
 * ==========================================================
 */

const { SlashCommandBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const { success, error } = require('../../utils/embed');
const { requirePermission } = require('../../services/permissionService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Belirtilen kanalın kilidini açar.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
        .addChannelOption((opt) => opt.setName('kanal').setDescription('Kilidi açılacak kanal')),

    async execute(interaction, client) {
        const channel = interaction.options.getChannel('kanal') || interaction.channel;

        const permErr = requirePermission(interaction.member, PermissionsBitField.Flags.ManageChannels, 'Kanalları Yönet');
        if (permErr) return interaction.reply({ embeds: [error('Yetki Hatası', permErr)], ephemeral: true });

        const everyone = interaction.guild.roles.everyone;

        try {
            if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement) {
                await channel.permissionOverwrites.edit(everyone.id, { SendMessages: null });
            } else if (channel.type === ChannelType.GuildVoice) {
                await channel.permissionOverwrites.edit(everyone.id, { Connect: null });
            } else {
                return interaction.reply({ embeds: [error('Hata', 'Bu kanal türü kilitlenemez.')], ephemeral: true });
            }

            await interaction.reply({
                embeds: [success('Kanal Açıldı', `<#${channel.id}> kanalının kilidi kaldırıldı.`)],
            });
        } catch (err) {
            await interaction.reply({ embeds: [error('Hata', `Kilidin kaldırılması başarısız: ${err.message}`)], ephemeral: true });
        }
    },
};