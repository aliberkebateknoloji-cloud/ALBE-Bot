/**
 * ==========================================================
 *  /TIMEOUT - Üyeye süreli susturma uygular
 *  Süre formatı: 1d 2h 30m 45s (veya sadece 10m)
 * ==========================================================
 */

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { success, error } = require('../../utils/embed');
const { parseDuration, formatDuration } = require('../../utils/time');
const {
    requirePermission,
    requireBotPermission,
    hierarchyError,
} = require('../../services/permissionService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Bir üyeye süreli susturma (timeout) uygular.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
        .addUserOption((opt) =>
            opt.setName('uye').setDescription('Susturulacak üye').setRequired(true)
        )
        .addStringOption((opt) =>
            opt.setName('sure').setDescription('Süre (örn: 1d 2h 30m 10s)').setRequired(true)
        )
        .addStringOption((opt) => opt.setName('sebep').setDescription('Susturma sebebi')),

    async execute(interaction, client) {
        const user = interaction.options.getUser('uye');
        const durationInput = interaction.options.getString('sure');
        const reason = interaction.options.getString('sebep') || client.config.moderation.defaultReason;

        const permErr = requirePermission(interaction.member, PermissionsBitField.Flags.ModerateMembers, 'Üyeleri Sustur');
        if (permErr) return interaction.reply({ embeds: [error('Yetki Hatası', permErr)], ephemeral: true });

        const botErr = requireBotPermission(interaction.guild, PermissionsBitField.Flags.ModerateMembers, 'Üyeleri Sustur');
        if (botErr) return interaction.reply({ embeds: [error('Yetki Hatası', botErr)], ephemeral: true });

        // Süre çözümleme
        const durationMs = parseDuration(durationInput);
        const maxMs = client.config.moderation.maxTimeoutDays * 86_400_000;
        if (!durationMs) {
            return interaction.reply({ embeds: [error('Hata', 'Geçersiz süre formatı. Örn: `1d 2h 30m`')], ephemeral: true });
        }
        if (durationMs > maxMs) {
            return interaction.reply({
                embeds: [error('Hata', `Süre en fazla **${client.config.moderation.maxTimeoutDays} gün** olabilir.`)],
                ephemeral: true,
            });
        }

        const target = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!target) {
            return interaction.reply({ embeds: [error('Hata', 'Hedef üye bulunamadı.')], ephemeral: true });
        }

        const hierErr = hierarchyError(interaction.member, target);
        if (hierErr) return interaction.reply({ embeds: [error('Hiyerarşi Hatası', hierErr)], ephemeral: true });

        await interaction.deferReply();

        try {
            await target.timeout(durationMs, reason);
            await interaction.editReply({
                embeds: [
                    success('Üye Susturuldu', `**${user.tag}** için süreli susturma uygulandı.`).addFields(
                        { name: 'Süre', value: formatDuration(durationMs), inline: true },
                        { name: 'Sebep', value: reason, inline: true }
                    ),
                ],
            });
        } catch (err) {
            await interaction.editReply({ embeds: [error('Hata', `İşlem başarısız: ${err.message}`)] });
        }
    },
};