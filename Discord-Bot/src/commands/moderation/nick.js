/**
 * ==========================================================
 *  /NICK - Üyenin takma adını değiştirir
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
        .setName('nick')
        .setDescription('Bir üyenin takma adını değiştirir.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageNicknames)
        .addUserOption((opt) =>
            opt.setName('uye').setDescription('Takma adı değiştirilecek üye').setRequired(true)
        )
        .addStringOption((opt) =>
            opt.setName('takma-ad').setDescription('Yeni takma ad (boş bırakılırsa sıfırlanır)')
        ),

    async execute(interaction, client) {
        const user = interaction.options.getUser('uye');
        const nickname = interaction.options.getString('takma-ad');

        const permErr = requirePermission(interaction.member, PermissionsBitField.Flags.ManageNicknames, 'Takma Adları Yönet');
        if (permErr) return interaction.reply({ embeds: [error('Yetki Hatası', permErr)], ephemeral: true });

        const botErr = requireBotPermission(interaction.guild, PermissionsBitField.Flags.ManageNicknames, 'Takma Adları Yönet');
        if (botErr) return interaction.reply({ embeds: [error('Yetki Hatası', botErr)], ephemeral: true });

        const target = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!target) {
            return interaction.reply({ embeds: [error('Hata', 'Hedef üye bulunamadı.')], ephemeral: true });
        }

        const hierErr = hierarchyError(interaction.member, target);
        if (hierErr) return interaction.reply({ embeds: [error('Hiyerarşi Hatası', hierErr)], ephemeral: true });

        try {
            await target.setNickname(nickname || null);
            const text = nickname
                ? `**${user.tag}** takma adı **${nickname}** olarak değiştirildi.`
                : `**${user.tag}** takma adı sıfırlandı.`;

            await interaction.reply({ embeds: [success('Takma Ad', text)] });
        } catch (err) {
            await interaction.reply({ embeds: [error('Hata', `İşlem başarısız: ${err.message}`)], ephemeral: true });
        }
    },
};