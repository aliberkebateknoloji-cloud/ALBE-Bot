/**
 * ==========================================================
 *  /GUARD - Anti-bot (anti-raid) koruma ayarları
 *  Alt komutlar: durum | antibot | limit
 * ==========================================================
 */

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { info, success, error } = require('../../utils/embed');
const { hasDatabase, getGuild } = require('../../utils/guild');
const { requirePermission } = require('../../services/permissionService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guard')
        .setDescription('Sunucu koruma (anti-bot / anti-raid) ayarları.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addSubcommand((sub) =>
            sub.setName('durum').setDescription('Mevcut koruma ayarlarını gösterir')
        )
        .addSubcommand((sub) =>
            sub
                .setName('antibot')
                .setDescription('Anti-bot korumasını aç/kapat')
                .addBooleanOption((opt) =>
                    opt.setName('durum').setDescription('Açık mı, kapalı mı?').setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('limit')
                .setDescription('Dakikada izin verilen katılım limitini ayarla')
                .addIntegerOption((opt) =>
                    opt
                        .setName('sayi')
                        .setDescription('Limit (1-50)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(50)
                )
        ),

    async execute(interaction, client) {
        if (!hasDatabase(client)) {
            return interaction.reply({ embeds: [error('Veritabanı Gerekli', 'Bu komut için MongoDB bağlantısı gerekli.')], ephemeral: true });
        }

        const permErr = requirePermission(interaction.member, PermissionsBitField.Flags.Administrator, 'Yönetici');
        if (permErr) return interaction.reply({ embeds: [error('Yetki Hatası', permErr)], ephemeral: true });

        const doc = await getGuild(interaction.guildId);
        const sub = interaction.options.getSubcommand();

        // --- DURUM ---
        if (sub === 'durum') {
            return interaction.reply({
                embeds: [
                    info('Sunucu Koruma Ayarları', `${client.config.emoji.guard} Guard sistemi bilgileri.`).addFields(
                        { name: 'Anti-Bot', value: doc.antibotEnabled ? '✅ Açık' : '❌ Kapalı', inline: true },
                        { name: 'Katılım Limiti', value: `${doc.maxJoinsPerMinute}/dakika`, inline: true },
                        { name: 'Kilit Durumu', value: doc.lockdown.length > 0 ? '🔒 Kilitli' : '🔓 Açık', inline: true }
                    ),
                ],
            });
        }

        // --- ANTIBOT ---
        if (sub === 'antibot') {
            const state = interaction.options.getBoolean('durum');
            doc.antibotEnabled = state;
            await doc.save();
            return interaction.reply({
                embeds: [success('Anti-Bot Güncellendi', `Anti-bot koruması ${state ? '**açıldı**' : '**kapatıldı**'}.`)],
            });
        }

        // --- LIMIT ---
        if (sub === 'limit') {
            const limit = interaction.options.getInteger('sayi');
            doc.maxJoinsPerMinute = limit;
            await doc.save();
            return interaction.reply({
                embeds: [success('Limit Güncellendi', `Dakikada izin verilen katılım limiti **${limit}** olarak ayarlandı.`)],
            });
        }
    },
};