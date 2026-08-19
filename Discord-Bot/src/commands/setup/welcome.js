/**
 * ==========================================================
 *  /WELCOME - Hoş geldin / Görüşürüz sistemi ayarları
 *  Alt komutlar: kanal | test | kapat
 *  {user} {memberCount} {server} değişkenleri mesajda kullanılabilir.
 * ==========================================================
 */

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { info, success, error, warning } = require('../../utils/embed');
const { hasDatabase, getGuild } = require('../../utils/guild');
const { requirePermission } = require('../../services/permissionService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Hoş geldin / Görüşürüz mesaj sistemini yönetir.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
        .addSubcommand((sub) =>
            sub
                .setName('kanal')
                .setDescription('Karşılama kanalını ayarlar (veya günceller)')
                .addStringOption((opt) =>
                    opt
                        .setName('tur')
                        .setDescription('Mesaj türü')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Hoş Geldin', value: 'join' },
                            { name: 'Görüşürüz', value: 'leave' }
                        )
                )
                .addChannelOption((opt) =>
                    opt.setName('kanal').setDescription('Mesajın gönderileceği kanal').setRequired(true)
                )
                .addStringOption((opt) =>
                    opt.setName('mesaj').setDescription('Özel mesaj şablonu ({user} {memberCount} {server})')
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('test')
                .setDescription('Ayarlanmış mesajları test eder')
                .addStringOption((opt) =>
                    opt
                        .setName('tur')
                        .setDescription('Hangi mesaj teste edilsin?')
                        .addChoices(
                            { name: 'Hoş Geldin', value: 'join' },
                            { name: 'Görüşürüz', value: 'leave' }
                        )
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('kapat')
                .setDescription('Sistemi kapatır')
                .addStringOption((opt) =>
                    opt
                        .setName('tur')
                        .setDescription('Kapatılacak sistem')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Hoş Geldin', value: 'join' },
                            { name: 'Görüşürüz', value: 'leave' }
                        )
                )
        ),

    async execute(interaction, client) {
        if (!hasDatabase(client)) {
            return interaction.reply({ embeds: [error('Veritabanı Gerekli', 'Bu komut için MongoDB bağlantısı gerekli.')], ephemeral: true });
        }

        const permErr = requirePermission(interaction.member, PermissionsBitField.Flags.ManageGuild, 'Sunucuyu Yönet');
        if (permErr) return interaction.reply({ embeds: [error('Yetki Hatası', permErr)], ephemeral: true });

        const doc = await getGuild(interaction.guildId);
        const sub = interaction.options.getSubcommand();
        const targetType = interaction.options.getString('tur');
        const isJoin = targetType !== 'leave';
        const cfg = client.config.welcome;

        // --- KANAL AYARLA ---
        if (sub === 'kanal') {
            const channel = interaction.options.getChannel('kanal');
            const message = interaction.options.getString('mesaj');

            if (!channel.isTextBased()) {
                return interaction.reply({ embeds: [error('Hata', 'Karşılama kanalı bir metin kanalı olmalı.')], ephemeral: true });
            }

            if (isJoin) {
                doc.welcomeChannelId = channel.id;
                if (message) doc.welcomeMessage = message;
                doc.welcomeEnabled = true;
            } else {
                doc.leaveChannelId = channel.id;
                if (message) doc.leaveMessage = message;
                doc.leaveEnabled = true;
            }
            await doc.save();

            return interaction.reply({
                embeds: [
                    success('Sistem Ayarlandı', `${isJoin ? 'Hoş Geldin' : 'Görüşürüz'} mesajları <#${channel.id}> kanalına **gönderilecek**.`),
                ],
            });
        }

        // --- TEST ---
        if (sub === 'test') {
            const tests = targetType
                ? [{ id: isJoin ? doc.welcomeChannelId : doc.leaveChannelId, join: isJoin }]
                : [
                      { id: doc.welcomeChannelId, join: true },
                      { id: doc.leaveChannelId, join: false },
                  ];

            for (const { id, join } of tests) {
                const channel = interaction.guild.channels.cache.get(id);
                if (!channel || !channel.isTextBased()) continue;

                const template = join
                    ? doc.welcomeMessage || cfg.joinMessage
                    : doc.leaveMessage || cfg.leaveMessage;

                const message = template
                    .replaceAll('{user}', `<@${interaction.user.id}>`)
                    .replaceAll('{memberCount}', interaction.guild.memberCount)
                    .replaceAll('{server}', interaction.guild.name);

                await channel.send({
                    embeds: [
                        info(
                            `${client.config.emoji.welcome} ${join ? cfg.joinTitle : cfg.leaveTitle}`,
                            message
                        ).setAuthor({ name: 'Test Mesajı (silinebilir)' }),
                    ],
                });
            }

            return interaction.reply({ embeds: [success('Test Gönderildi', 'Mesajlar hedef kanallara gönderildi.')], ephemeral: true });
        }

        // --- KAPAT ---
        if (sub === 'kapat') {
            if (isJoin) {
                doc.welcomeEnabled = false;
                doc.welcomeChannelId = null;
            } else {
                doc.leaveEnabled = false;
                doc.leaveChannelId = null;
            }
            await doc.save();

            return interaction.reply({
                embeds: [warning('Sistem Kapatıldı', `${isJoin ? 'Hoş Geldin' : 'Görüşürüz'} mesajları devre dışı bırakıldı.`)],
            });
        }
    },
};