/**
 * ==========================================================
 *  /TICKETPANEL - Kategori seçim menüsünden ticket paneli kurar
 * ----------------------------------------------------------
 *  İsteğe bağlı "destek-rol" ile destek ekibi rolü atanır.
 *  Kategori listesi config.json > ticket > categories bölümünden gelir.
 * ==========================================================
 */

const { SlashCommandBuilder, PermissionsBitField, ActionRowBuilder, StringSelectMenuBuilder, ChannelType } = require('discord.js');
const { success, error, info } = require('../../utils/embed');
const { hasDatabase, getGuild } = require('../../utils/guild');
const { requirePermission } = require('../../services/permissionService');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticketpanel')
        .setDescription('Ticket panelini (seçim menüsü) oluşturur.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
        .addChannelOption((opt) =>
            opt.setName('kanal').setDescription('Panelin gönderileceği kanal (varsayılan: bu kanal)')
        )
        .addRoleOption((opt) => opt.setName('destek-rol').setDescription('Destek ekibi rolü (panel kurulumuyla kaydedilir)')),

    async execute(interaction, client) {
        const targetChannel = interaction.options.getChannel('kanal') || interaction.channel;

        const permErr = requirePermission(interaction.member, PermissionsBitField.Flags.ManageChannels, 'Kanalları Yönet');
        if (permErr) return interaction.reply({ embeds: [error('Yetki Hatası', permErr)], ephemeral: true });

        if (targetChannel.type !== ChannelType.GuildText) {
            return interaction.reply({ embeds: [error('Hata', 'Panel yalnızca metin kanalına gönderilebilir.')], ephemeral: true });
        }

        const cfg = client.config.ticket;

        // Destek rolü kaydetme
        const supportRole = interaction.options.getRole('destek-rol');
        if (supportRole) {
            if (!hasDatabase(client)) {
                return interaction.reply({ embeds: [error('Veritabanı Gerekli', 'Destek rolü kaydı için MongoDB gerekli.')], ephemeral: true });
            }
            const doc = await getGuild(interaction.guildId);
            doc.ticketSupportRoleIds = [supportRole.id];
            await doc.save();
        }

        // Panel embed'i
        const categoryList = cfg.categories.map((c) => `${c.emoji} **${c.label}** — ${c.description}`).join('\n');

        const embed = info(
            `${cfg.categories[0]?.emoji || '🎫'} Destek Sistemi`,
            `Aşağıdaki menüden **talebinin kategorisini** seçerek destek ticketı oluşturabilirsin.\n\n${categoryList}`
        );

        // Kategori seçim menüsü
        const menu = new StringSelectMenuBuilder()
            .setCustomId('ticket_select')
            .setPlaceholder('Bir kategori seç...')
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(
                cfg.categories.map((c) => ({
                    label: c.label,
                    description: c.description,
                    value: c.key,
                    emoji: c.emoji,
                }))
            );

        const row = new ActionRowBuilder().addComponents(menu);

        await targetChannel.send({ embeds: [embed], components: [row] });

        await interaction.reply({
            embeds: [success('Panel Yayınlandı', `Ticket paneli <#${targetChannel.id}> kanalına gönderildi.`)],
            ephemeral: true,
        });
    },
};