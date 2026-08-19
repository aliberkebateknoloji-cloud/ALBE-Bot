/**
 * ==========================================================
 *  /WARNS - Üyenin aldığı tüm uyarıları listeler
 * ==========================================================
 */

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { info, error } = require('../../utils/embed');
const { hasDatabase } = require('../../utils/guild');
const { requirePermission } = require('../../services/permissionService');
const { formatDate } = require('../../utils/time');
const Warn = require('../../schemas/Warn');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warns')
        .setDescription('Bir üyenin uyarı geçmişini listeler.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
        .addUserOption((opt) =>
            opt.setName('uye').setDescription('Uyarıları görüntülenecek üye').setRequired(true)
        ),

    async execute(interaction, client) {
        if (!hasDatabase(client)) {
            return interaction.reply({ embeds: [error('Veritabanı Gerekli', 'Bu komut için MongoDB bağlantısı gerekli.')], ephemeral: true });
        }

        const user = interaction.options.getUser('uye');

        const permErr = requirePermission(interaction.member, PermissionsBitField.Flags.ModerateMembers, 'Üyeleri Sustur');
        if (permErr) return interaction.reply({ embeds: [error('Yetki Hatası', permErr)], ephemeral: true });

        const warns = await Warn.find({ guildId: interaction.guildId, userId: user.id }).sort({ caseId: 1 });

        const fields = warns.slice(0, 25).map((w) => ({
            name: `#${w.caseId} • ${formatDate(w.createdAt)}`,
            value: `**Sebep:** ${w.reason}\n**Yetkili:** <@${w.moderatorId}>`,
        }));

        const desc = warns.length === 0
            ? `**${user.tag}** hiç uyarı almamış.`
            : `**${user.tag}** üyesinin toplam **${warns.length}** uyarı kaydı.`;

        await interaction.reply({
            embeds: [info('Uyarı Geçmişi', desc).addFields(fields.length ? fields : [{ name: 'Kayıt', value: 'Uyarı bulunamadı.' }])],
        });
    },
};