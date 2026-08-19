/**
 * ==========================================================
 *  /TICKET-ADD - Ticket kanalına üye ekler
 * ==========================================================
 */

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { success, error } = require('../../utils/embed');
const { hasDatabase, getGuild } = require('../../utils/guild');
const Ticket = require('../../schemas/Ticket');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-add')
        .setDescription('Bulunduğun ticket kanalına bir üye ekler.')
        .addUserOption((opt) =>
            opt.setName('uye').setDescription('Tickete eklenecek üye').setRequired(true)
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

        // Yetki kontrolü: destek ekibi
        const guildDoc = await getGuild(interaction.guildId);
        const isStaff =
            interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels) ||
            (guildDoc.ticketSupportRoleIds || []).some((rid) => interaction.member.roles.cache.has(rid));

        if (!isStaff) {
            return interaction.reply({ embeds: [error('Yetki Hatası', 'Bu işlem için destek ekibi üyesi olmalısın.')], ephemeral: true });
        }

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) {
            return interaction.reply({ embeds: [error('Hata', 'Hedef üye bu sunucuda bulunamadı.')], ephemeral: true });
        }

        await interaction.channel.permissionOverwrites.edit(member.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            AttachFiles: true,
            EmbedLinks: true,
        });

        await interaction.reply({
            embeds: [success('Üye Eklendi', `${member} tickete eklendi.`)],
        });
    },
};