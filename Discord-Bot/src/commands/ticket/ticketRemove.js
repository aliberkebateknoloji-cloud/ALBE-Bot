/**
 * ==========================================================
 *  /TICKET-REMOVE - Ticket kanalından üye çıkarır
 * ==========================================================
 */

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { success, error } = require('../../utils/embed');
const { hasDatabase, getGuild } = require('../../utils/guild');
const Ticket = require('../../schemas/Ticket');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-remove')
        .setDescription('Bulunduğun ticket kanalından bir üyeyi çıkarır.')
        .addUserOption((opt) =>
            opt.setName('uye').setDescription('Ticketten çıkarılacak üye').setRequired(true)
        ),

    async execute(interaction, client) {
        if (!hasDatabase(client)) {
            return interaction.reply({ embeds: [error('Veritabanı Gerekli', 'Bu komut için MongoDB bağlantısı gerekli.')], ephemeral: true });
        }

        const user = interaction.options.getUser('uye');

        const doc = await Ticket.findOne({ guildId: interaction.guildId, channelId: interaction.channelId });
        if (!doc) {
            return interaction.reply({ embeds: [error('Hata', 'Bu kanal, geçerli bir ticket değil.')], ephemeral: true });
        }

        const guildDoc = await getGuild(interaction.guildId);
        const isStaff =
            interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels) ||
            (guildDoc.ticketSupportRoleIds || []).some((rid) => interaction.member.roles.cache.has(rid));

        if (!isStaff) {
            return interaction.reply({ embeds: [error('Yetki Hatası', 'Bu işlem için destek ekibi üyesi olmalısın.')], ephemeral: true });
        }

        // Ticket sahibi çıkarılamaz
        if (user.id === doc.creatorId) {
            return interaction.reply({ embeds: [error('Hata', 'Ticket sahibi çıkarılamaz.')], ephemeral: true });
        }

        await interaction.channel.permissionOverwrites.edit(user.id, { ViewChannel: false });

        await interaction.reply({
            embeds: [success('Üye Çıkarıldı', `<@${user.id}> ticketten çıkarıldı.`)],
        });
    },
};