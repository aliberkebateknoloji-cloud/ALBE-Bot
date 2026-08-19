/**
 * ==========================================================
 *  /TICKET-CLOSE - Ticket kanalını kapatır (komut versiyonu)
 *  Buton yerine komutla da kapanış sağlanabilir.
 * ==========================================================
 */

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { success, error } = require('../../utils/embed');
const { hasDatabase } = require('../../utils/guild');
const { closeTicket } = require('../../services/ticketService');
const { getGuild } = require('../../utils/guild');
const Ticket = require('../../schemas/Ticket');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-close')
        .setDescription('Bulunduğun ticket kanalını kapatır.')
        .addStringOption((opt) => opt.setName('sebep').setDescription('Kapanış sebebi')),

    async execute(interaction, client) {
        if (!hasDatabase(client)) {
            return interaction.reply({ embeds: [error('Veritabanı Gerekli', 'Bu komut için MongoDB bağlantısı gerekli.')], ephemeral: true });
        }

        const doc = await Ticket.findOne({ guildId: interaction.guildId, channelId: interaction.channelId });
        if (!doc || doc.status !== 'open') {
            return interaction.reply({ embeds: [error('Hata', 'Bu kanal, açık bir ticket değil.')], ephemeral: true });
        }

        // Yetki: ticket sahibi veya destek ekibi
        const guildDoc = await getGuild(interaction.guildId);
        const isStaff =
            interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels) ||
            (guildDoc.ticketSupportRoleIds || []).some((rid) => interaction.member.roles.cache.has(rid));

        if (interaction.user.id !== doc.creatorId && !isStaff) {
            return interaction.reply({ embeds: [error('Yetki Hatası', 'Bu ticketı kapatma yetkin yok.')], ephemeral: true });
        }

        const reason = interaction.options.getString('sebep') || null;

        await interaction.deferReply({ ephemeral: true });
        const result = await closeTicket(client, interaction.guild, interaction.channel, interaction.member, reason);

        await interaction.followUp({
            embeds: [
                result.ok
                    ? success('Ticket Kapatıldı', 'Transkript arşiv kanalına eklendi.')
                    : error('Hata', result.error),
            ],
            ephemeral: true,
        });
    },
};