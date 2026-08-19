/**
 * ==========================================================
 *  /UNWARN - Üyenin belirli bir uyarısını kaldırır
 * ==========================================================
 */

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { success, error } = require('../../utils/embed');
const { hasDatabase } = require('../../utils/guild');
const { requirePermission } = require('../../services/permissionService');
const Warn = require('../../schemas/Warn');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unwarn')
        .setDescription('Bir üyenin belirli bir uyarısını kaldırır.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
        .addUserOption((opt) =>
            opt.setName('uye').setDescription('Uyarısı kaldırılacak üye').setRequired(true)
        )
        .addIntegerOption((opt) =>
            opt.setName('case').setDescription('Kaldırılacak uyarı numarası (#)').setRequired(true).setMinValue(1)
        ),

    async execute(interaction, client) {
        if (!hasDatabase(client)) {
            return interaction.reply({ embeds: [error('Veritabanı Gerekli', 'Bu komut için MongoDB bağlantısı gerekli.')], ephemeral: true });
        }

        const user = interaction.options.getUser('uye');
        const caseId = interaction.options.getInteger('case');

        const permErr = requirePermission(interaction.member, PermissionsBitField.Flags.ModerateMembers, 'Üyeleri Sustur');
        if (permErr) return interaction.reply({ embeds: [error('Yetki Hatası', permErr)], ephemeral: true });

        const deleted = await Warn.findOneAndDelete({
            guildId: interaction.guildId,
            userId: user.id,
            caseId,
        });

        if (!deleted) {
            return interaction.reply({
                embeds: [error('Hata', `**${user.tag}** üyesinin **#${caseId}** numaralı uyarısı bulunamadı.`)],
                ephemeral: true,
            });
        }

        await interaction.reply({
            embeds: [success('Uyarı Kaldırıldı', `**${user.tag}** üyesinin **#${caseId}** numaralı uyarısı kaldırıldı.`)],
        });
    },
};