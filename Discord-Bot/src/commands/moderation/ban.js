/**
 * ==========================================================
 *  /BAN - Üyeyi sunucudan yasaklar
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
        .setName('ban')
        .setDescription('Bir üyeyi sunucudan yasaklar.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers)
        .addUserOption((opt) =>
            opt.setName('uye').setDescription('Yasaklanacak üye').setRequired(true)
        )
        .addStringOption((opt) => opt.setName('sebep').setDescription('Yasaklama sebebi'))
        .addIntegerOption((opt) =>
            opt
                .setName('mesaj-silme')
                .setDescription('Kaç günlük mesajı silinsin? (0-7)')
                .setMinValue(0)
                .setMaxValue(7)
        ),

    async execute(interaction, client) {
        const user = interaction.options.getUser('uye');
        const reason = interaction.options.getString('sebep') || client.config.moderation.defaultReason;
        const deleteDays = interaction.options.getInteger('mesaj-silme') ?? 0;

        // Yetki kontrolleri
        const permErr = requirePermission(interaction.member, PermissionsBitField.Flags.BanMembers, 'Üyeleri Yasakla');
        if (permErr) return interaction.reply({ embeds: [error('Yetki Hatası', permErr)], ephemeral: true });

        const botErr = requireBotPermission(interaction.guild, PermissionsBitField.Flags.BanMembers, 'Üyeleri Yasakla');
        if (botErr) return interaction.reply({ embeds: [error('Yetki Hatası', botErr)], ephemeral: true });

        if (user.id === client.user.id) {
            return interaction.reply({ embeds: [error('Hata', 'Kendimi yasaklayamam!')], ephemeral: true });
        }
        if (user.id === interaction.guild.ownerId) {
            return interaction.reply({ embeds: [error('Hata', 'Sunucu sahibi yasaklanamaz.')], ephemeral: true });
        }

        // Rol hiyerarşisi kontrolü
        const target = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (target) {
            const hierErr = hierarchyError(interaction.member, target);
            if (hierErr) return interaction.reply({ embeds: [error('Hiyerarşi Hatası', hierErr)], ephemeral: true });
        }

        await interaction.deferReply();

        try {
            await interaction.guild.bans.create(user, {
                reason,
                deleteMessageSeconds: deleteDays * 86_400,
            });

            await interaction.editReply({
                embeds: [
                    success('Üye Yasaklandı', `**${user.tag}** (\`${user.id}\`) sunucudan yasaklandı.`).addFields(
                        { name: 'Sebep', value: reason },
                        { name: 'Silinen Mesaj', value: `${deleteDays} gün`, inline: true }
                    ),
                ],
            });
        } catch (err) {
            await interaction.editReply({ embeds: [error('Hata', `Yasaklama başarısız: ${err.message}`)] });
        }
    },
};