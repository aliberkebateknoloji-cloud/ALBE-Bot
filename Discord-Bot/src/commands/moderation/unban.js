/**
 * ==========================================================
 *  /UNBAN - Yasaklı üyenin yasağını kaldırır
 * ==========================================================
 */

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { success, error } = require('../../utils/embed');
const { requirePermission, requireBotPermission } = require('../../services/permissionService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Yasaklanmış bir üyenin yasağını kaldırır.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers)
        .addStringOption((opt) =>
            opt.setName('kullanici').setDescription('Yasağı kaldırılacak kullanıcı ID').setRequired(true)
        )
        .addStringOption((opt) => opt.setName('sebep').setDescription('İşlem sebebi')),

    async execute(interaction, client) {
        const input = interaction.options.getString('kullanici');
        const reason = interaction.options.getString('sebep') || client.config.moderation.defaultReason;

        const permErr = requirePermission(interaction.member, PermissionsBitField.Flags.BanMembers, 'Üyeleri Yasakla');
        if (permErr) return interaction.reply({ embeds: [error('Yetki Hatası', permErr)], ephemeral: true });

        const botErr = requireBotPermission(interaction.guild, PermissionsBitField.Flags.BanMembers, 'Üyeleri Yasakla');
        if (botErr) return interaction.reply({ embeds: [error('Yetki Hatası', botErr)], ephemeral: true });

        if (!/^\d{15,20}$/.test(input)) {
            return interaction.reply({ embeds: [error('Hata', 'Geçersiz kullanıcı ID formatı.')], ephemeral: true });
        }

        await interaction.deferReply();

        try {
            const bannedUser = await interaction.guild.bans.resolve(input);
            if (!bannedUser) {
                return interaction.editReply({ embeds: [error('Hata', 'Bu kullanıcı yasaklı değil.')] });
            }

            await interaction.guild.bans.remove(input, reason);
            await interaction.editReply({
                embeds: [
                    success('Yasak Kaldırıldı', `**${bannedUser.user.tag}** (\`${input}\`) için yasak kaldırıldı.`).addFields({
                        name: 'Sebep',
                        value: reason,
                    }),
                ],
            });
        } catch (err) {
            await interaction.editReply({ embeds: [error('Hata', `İşlem başarısız: ${err.message}`)] });
        }
    },
};