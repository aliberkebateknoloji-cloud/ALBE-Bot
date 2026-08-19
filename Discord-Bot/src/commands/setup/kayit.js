/**
 * ==========================================================
 *  /KAYIT - Kayıt (registration) sistemi
 *  Alt komutlar: panel | ayarla | kapat
 * ==========================================================
 */

const {
    SlashCommandBuilder,
    PermissionsBitField,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
} = require('discord.js');
const { info, success, error, warning } = require('../../utils/embed');
const { hasDatabase, getGuild } = require('../../utils/guild');
const { requirePermission } = require('../../services/permissionService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kayit')
        .setDescription('Kayıt (registration) sistemini yönetir.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
        .addSubcommand((sub) =>
            sub
                .setName('panel')
                .setDescription('Kayıt panelini (butonlar) bir kanala gönderir')
                .addChannelOption((opt) =>
                    opt.setName('kanal').setDescription('Panelin gönderileceği kanal').setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('ayarla')
                .setDescription('Kayıt rollerini ayarlar')
                .addRoleOption((opt) =>
                    opt.setName('uye-rol').setDescription('Onaylanınca verilecek rol').setRequired(true)
                )
                .addRoleOption((opt) => opt.setName('kayitsiz-rol').setDescription('Kayıtsız üyelere verilen rol (opsiyonel)'))
        )
        .addSubcommand((sub) => sub.setName('kapat').setDescription('Kayıt sistemini kapatır')),

    async execute(interaction, client) {
        if (!hasDatabase(client)) {
            return interaction.reply({ embeds: [error('Veritabanı Gerekli', 'Bu komut için MongoDB bağlantısı gerekli.')], ephemeral: true });
        }

        const permErr = requirePermission(interaction.member, PermissionsBitField.Flags.ManageGuild, 'Sunucuyu Yönet');
        if (permErr) return interaction.reply({ embeds: [error('Yetki Hatası', permErr)], ephemeral: true });

        const doc = await getGuild(interaction.guildId);
        const sub = interaction.options.getSubcommand();
        const cfg = client.config.kayit;

        // --- PANEL ---
        if (sub === 'panel') {
            const channel = interaction.options.getChannel('kanal');
            if (channel.type !== ChannelType.GuildText) {
                return interaction.reply({ embeds: [error('Hata', 'Panel yalnızca metin kanalına gönderilebilir.')], ephemeral: true });
            }

            if (!doc.kayitMemberRoleId) {
                return interaction.reply({
                    embeds: [error('Önce Ayarla', 'Önce `/kayit ayarla` komutuyla üye rolünü belirlemelisin.')],
                    ephemeral: true,
                });
            }

            const embed = info(cfg.panelTitle, cfg.panelDescription);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('kayit_yes').setLabel('Kayıt Ol').setStyle(ButtonStyle.Success).setEmoji('✅'),
                new ButtonBuilder().setCustomId('kayit_no').setLabel('Bilgi').setStyle(ButtonStyle.Secondary).setEmoji('ℹ️')
            );

            await channel.send({ embeds: [embed], components: [row] });

            doc.kayitEnabled = true;
            doc.kayitChannelId = channel.id;
            await doc.save();

            return interaction.reply({
                embeds: [success('Panel Yayınlandı', `Kayıt paneli <#${channel.id}> kanalına gönderildi.`)],
                ephemeral: true,
            });
        }

        // --- AYARLA ---
        if (sub === 'ayarla') {
            const memberRole = interaction.options.getRole('uye-rol');
            const unregisteredRole = interaction.options.getRole('kayitsiz-rol');

            doc.kayitMemberRoleId = memberRole.id;
            doc.kayitUnregisteredRoleId = unregisteredRole?.id || null;
            await doc.save();

            return interaction.reply({
                embeds: [
                    success('Roller Ayarlandı', `Üye rolü: ${memberRole}\nKayıtsız rolü: ${unregisteredRole || 'Belirlenmedi'}.`),
                ],
            });
        }

        // --- KAPAT ---
        if (sub === 'kapat') {
            doc.kayitEnabled = false;
            doc.kayitMemberRoleId = null;
            await doc.save();
            return interaction.reply({
                embeds: [warning('Sistem Kapatıldı', 'Kayıt sistemi devre dışı bırakıldı.')],
            });
        }
    },
};