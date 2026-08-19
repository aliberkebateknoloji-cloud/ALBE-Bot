/**
 * ==========================================================
 *  /KICK - Üyeyi sunucudan atar
 * ==========================================================
 */

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { success, error } = require('../../utils/embed');
const {
    requirePermission,
    requireBotPermission,
    hierarchyError,
} = require('../../services/permissionService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Bir üyeyi sunucudan atar.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers)
        .addUserOption((opt) =>
            opt.setName('uye').setDescription('Atılacak üye').setRequired(true)
        )
        .addStringOption((opt) => opt.setName('sebep').setDescription('Atılma sebebi')),

    async execute(interaction, client) {
        const user = interaction.options.getUser('uye');
        const reason = interaction.options.getString('sebep') || client.config.moderation.defaultReason;

        const permErr = requirePermission(interaction.member, PermissionsBitField.Flags.KickMembers, 'Üyeleri At');
        if (permErr) return interaction.reply({ embeds: [error('Yetki Hatası', permErr)], ephemeral: true });

        const botErr = requireBotPermission(interaction.guild, PermissionsBitField.Flags.KickMembers, 'Üyeleri At');
        if (botErr) return interaction.reply({ embeds: [error('Yetki Hatası', botErr)], ephemeral: true });

        if (user.id === client.user.id) {
            return interaction.reply({ embeds: [error('Hata', 'Kendimi atamam!')], ephemeral: true });
        }

        const target = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!target) {
            return interaction.reply({ embeds: [error('Hata', 'Hedef üye bulunamadı.')], ephemeral: true });
        }

        const hierErr = hierarchyError(interaction.member, target);
        if (hierErr) return interaction.reply({ embeds: [error('Hiyerarşi Hatası', hierErr)], ephemeral: true });

        await interaction.deferReply();

        try {
            await target.kick(reason);
            await interaction.editReply({
                embeds: [
                    success('Üye Atıldı', `**${user.tag}** (\`${user.id}\`) sunucudan atıldı.`).addFields({
                        name: 'Sebep',
                        value: reason,
                    }),
                ],
            });
        } catch (err) {
            await interaction.editReply({ embeds: [error('Hata', `Atma başarısız: ${err.message}`)] });
        }
    },
};