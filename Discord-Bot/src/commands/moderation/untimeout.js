/**
 * ==========================================================
 *  /UNTIMEOUT - Üyenin susturmasını kaldırır
 * ==========================================================
 */

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { success, error } = require('../../utils/embed');
const { requirePermission, requireBotPermission } = require('../../services/permissionService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('Bir üyenin susturmasını kaldırır.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
        .addUserOption((opt) =>
            opt.setName('uye').setDescription('Susturması kaldırılacak üye').setRequired(true)
        )
        .addStringOption((opt) => opt.setName('sebep').setDescription('İşlem sebebi')),

    async execute(interaction, client) {
        const user = interaction.options.getUser('uye');
        const reason = interaction.options.getString('sebep') || client.config.moderation.defaultReason;

        const permErr = requirePermission(interaction.member, PermissionsBitField.Flags.ModerateMembers, 'Üyeleri Sustur');
        if (permErr) return interaction.reply({ embeds: [error('Yetki Hatası', permErr)], ephemeral: true });

        const botErr = requireBotPermission(interaction.guild, PermissionsBitField.Flags.ModerateMembers, 'Üyeleri Sustur');
        if (botErr) return interaction.reply({ embeds: [error('Yetki Hatası', botErr)], ephemeral: true });

        const target = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!target) {
            return interaction.reply({ embeds: [error('Hata', 'Hedef üye bulunamadı.')], ephemeral: true });
        }

        try {
            await target.timeout(null, reason);
            await interaction.reply({
                embeds: [success('Susturma Kaldırıldı', `**${user.tag}** için susturma kaldırıldı.`)],
            });
        } catch (err) {
            await interaction.reply({ embeds: [error('Hata', `İşlem başarısız: ${err.message}`)], ephemeral: true });
        }
    },
};