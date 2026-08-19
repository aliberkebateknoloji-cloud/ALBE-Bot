/**
 * ==========================================================
 *  /WARN - Üyeye uyarı ekler (DB'ye kaydedilir)
 * ==========================================================
 */

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { success, error } = require('../../utils/embed');
const { hasDatabase } = require('../../utils/guild');
const { requirePermission } = require('../../services/permissionService');
const Warn = require('../../schemas/Warn');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Bir üyeye sistem kayıtlı uyarı ekler.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
        .addUserOption((opt) =>
            opt.setName('uye').setDescription('Uyarılacak üye').setRequired(true)
        )
        .addStringOption((opt) => opt.setName('sebep').setDescription('Uyarı sebebi')),

    async execute(interaction, client) {
        if (!hasDatabase(client)) {
            return interaction.reply({ embeds: [error('Veritabanı Gerekli', 'Bu komut için MongoDB bağlantısı gerekli.')], ephemeral: true });
        }

        const user = interaction.options.getUser('uye');
        const reason = interaction.options.getString('sebep') || client.config.moderation.defaultReason;

        const permErr = requirePermission(interaction.member, PermissionsBitField.Flags.ModerateMembers, 'Üyeleri Sustur');
        if (permErr) return interaction.reply({ embeds: [error('Yetki Hatası', permErr)], ephemeral: true });

        // En yüksek case numarasını bul ve +1 kullan
        const lastWarn = await Warn.findOne({ guildId: interaction.guildId }).sort({ caseId: -1 });
        const caseId = (lastWarn?.caseId || 0) + 1;

        await Warn.create({
            guildId: interaction.guildId,
            userId: user.id,
            moderatorId: interaction.user.id,
            caseId,
            reason,
        });

        // Kullanıcıya DM bilgilendirmesi dene (başarısız olabilir)
        await user
            .send({ embeds: [success(`Uyarı #${caseId}`, `${interaction.guild.name} sunucusunda uyarı aldın.`).addFields({ name: 'Sebep', value: reason })] })
            .catch(() => {});

        await interaction.reply({
            embeds: [
                success('Uyarı Eklendi', `**${user.tag}** (\`${user.id}\`) için **#${caseId}** numaralı uyarı oluşturuldu.`).addFields({
                    name: 'Sebep',
                    value: reason,
                }),
            ],
        });
    },
};