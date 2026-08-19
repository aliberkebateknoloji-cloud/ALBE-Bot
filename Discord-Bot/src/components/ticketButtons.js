/**
 * ==========================================================
 *  TICKET COMPONENT DOSYASI
 * ----------------------------------------------------------
 *  Tartışılan customId'ler:
 *  - "ticket_select"           : paneldeki kategori seçim menüsü
 *  - "ticket_action:close"     : kapatma onay adımı
 *  - "ticket_confirm_close"    : kapatmayı onayla
 *  - "ticket_cancel_close"     : kapatmayı iptal et
 *  - "ticket_action:claim"     : ticketi devral
 *  - "ticket_action:add"       : üye ekleme modalı
 *  - "ticket_action:remove"    : üye çıkarma modalı
 *  - "ticket_modal:add"        : üye ekleme modal gönderimi
 *  - "ticket_modal:remove"     : üye çıkarma modal gönderimi
 * ==========================================================
 */

const {
    PermissionsBitField,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require('discord.js');
const { createTicket, closeTicket } = require('../services/ticketService');
const { getGuild } = require('../utils/guild');
const { formatDate } = require('../utils/time');
const Ticket = require('../schemas/Ticket');
const { logger } = require('../utils/logger');

/** Kullanıcının destek ekibinden olup olmadığını kontrol eder */
function isStaff(member, supportRoleIds) {
    if (member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return true;
    return supportRoleIds.some((id) => member.roles.cache.has(id));
}

/** original aksiyon buton satırını oluşturur */
function ticketRow(cfg) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_action:close').setLabel('Kapat').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
        new ButtonBuilder().setCustomId('ticket_action:claim').setLabel('Devral').setStyle(ButtonStyle.Primary).setEmoji('🫂'),
        new ButtonBuilder().setCustomId('ticket_action:add').setLabel('Üye Ekle').setStyle(ButtonStyle.Secondary).setEmoji('➕'),
        new ButtonBuilder().setCustomId('ticket_action:remove').setLabel('Üye Çıkar').setStyle(ButtonStyle.Secondary).setEmoji('➖')
    );
}

/**
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').ButtonInteraction|import('discord.js').AnySelectMenuInteraction|import('discord.js').ModalSubmitInteraction} interaction
 * @returns {Promise<boolean>}
 */
async function run(client, interaction) {
    const customId = interaction.customId;
    const guild = interaction.guild;

    // ============ SEPET MENÜSÜ: ticket açma ============
    if (customId === 'ticket_select') {
        if (!client.dbEnabled) {
            await interaction.reply({ content: 'Ticket sistemi için veritabanı bağlantısı gerekli.', ephemeral: true });
            return true;
        }
        const categoryKey = interaction.values[0];
        const result = await createTicket(client, guild, interaction.member, categoryKey);
        if (!result.ok) {
            await interaction.reply({
                embeds: [new EmbedBuilder().setColor(client.config.embeds.errorColor).setTitle('Hata').setDescription(result.error)],
                ephemeral: true,
            });
            return true;
        }
        await interaction.reply({ content: `Ticketın oluşturuldu: <#${result.channel.id}>`, ephemeral: true });
        return true;
    }

    // ============ MODAL GÖNDERİMLERİ ============
    if (customId === 'ticket_modal:add' || customId === 'ticket_modal:remove') {
        const userId = interaction.fields.getTextInputValue('user_id');
        const isAdd = customId === 'ticket_modal:add';

        if (!/^\d{15,20}$/.test(userId)) {
            await interaction.reply({ content: 'Geçersiz kullanıcı ID.', ephemeral: true });
            return true;
        }

        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) {
            await interaction.reply({ content: 'ID\'si verilen üye bu sunucuda bulunamadı.', ephemeral: true });
            return true;
        }

        const viewChannel = PermissionsBitField.Flags.ViewChannel;
        if (isAdd) {
            await interaction.channel.permissionOverwrites.create(member.id, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true,
                AttachFiles: true,
                EmbedLinks: true,
            });
        } else {
            await interaction.channel.permissionOverwrites.create(member.id, { ViewChannel: false });
        }

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(client.config.embeds.successColor)
                    .setTitle('İşlem Tamamlandı')
                    .setDescription(`${member} ${isAdd ? 'tickete eklendi' : 'ticketten çıkarıldı'}.`),
            ],
        });
        return true;
    }

    // ============ TICKET KANALI AKSİYONLARI ============
    if (customId.startsWith('ticket_action:')) {
        if (!guild) return true;

        // Ticket dokümanını bul
        const doc = await Ticket.findOne({ guildId: guild.id, channelId: interaction.channelId });
        if (!doc) {
            await interaction.reply({ content: 'Bu kanal, geçerli bir ticket değil.', ephemeral: true });
            return true;
        }

        const guildDoc = await getGuild(guild.id);
        const supportRoleIds = guildDoc.ticketSupportRoleIds || [];
        const callerIsStaff = isStaff(interaction.member, supportRoleIds);
        const isTicketOwner = interaction.user.id === doc.creatorId;

        const action = customId.split(':')[1];

        // --- Kapat onay akışı ---
        if (action === 'close') {
            if (!callerIsStaff && !isTicketOwner) {
                await interaction.reply({ content: 'Bu ticketı kapatma yetkin yok.', ephemeral: true });
                return true;
            }

            const confirmRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_confirm_close').setLabel('Onayla').setStyle(ButtonStyle.Danger).setEmoji('✅'),
                new ButtonBuilder().setCustomId('ticket_cancel_close').setLabel('İptal').setStyle(ButtonStyle.Secondary).setEmoji('❌')
            );

            await interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(client.config.embeds.warningColor)
                        .setTitle('Ticket Kapatılsın mı?')
                        .setDescription('Onaylarsan transkript oluşturulacak ve kanal arşive taşınacak.'),
                ],
                components: [confirmRow],
            });
            return true;
        }

        // --- Devral ---
        if (action === 'claim') {
            if (!callerIsStaff) {
                await interaction.reply({ content: 'Ticket devralma yetkin yok.', ephemeral: true });
                return true;
            }
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(client.config.embeds.infoColor)
                        .setDescription(`${interaction.member} bu ticketı devraldı.`),
                ],
            });
            return true;
        }

        // --- Üye ekleme / çıkarma modalı ---
        if (action === 'add' || action === 'remove') {
            if (!callerIsStaff) {
                await interaction.reply({ content: 'Bu işlem için destek ekibi üyesi olmalısın.', ephemeral: true });
                return true;
            }

            const isAdd = action === 'add';
            const input = new TextInputBuilder()
                .setCustomId('user_id')
                .setLabel(`Kullanıcı ID: ${isAdd ? 'EKLE' : 'ÇIKAR'}`)
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Örn: 123456789012345678')
                .setRequired(true);

            const modal = new ModalBuilder()
                .setCustomId(isAdd ? 'ticket_modal:add' : 'ticket_modal:remove')
                .setTitle(isAdd ? 'Üye Ekle' : 'Üye Çıkar')
                .addComponents(new ActionRowBuilder().addComponents(input));

            await interaction.showModal(modal);
            return true;
        }

        return true;
    }

    // ============ KAPATMA ONAYI / İPTALİ ============
    if (customId === 'ticket_confirm_close') {
        // Buton mesajını temizle ve etkileşimi onayla
        await interaction.update({ content: '🔄 İşlem yapılıyor...', embeds: [], components: [] });

        const result = await closeTicket(client, guild, interaction.channel, interaction.member);

        await interaction.followUp({
            embeds: [
                new EmbedBuilder()
                    .setColor(result.ok ? client.config.embeds.successColor : client.config.embeds.errorColor)
                    .setTitle(result.ok ? 'Ticket Kapatıldı' : 'Hata')
                    .setDescription(result.ok ? 'Transkript arşiv kanalına eklendi. Kanal arşive taşındı.' : result.error),
            ],
            ephemeral: true,
        });
        logger.success(`Ticket kapatıldı: ${interaction.channel.name}`);
        return true;
    }

    if (customId === 'ticket_cancel_close') {
        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor(client.config.embeds.defaultColor)
                    .setDescription('Kapatma işlemi iptal edildi.'),
            ],
            components: [ticketRow(client.config)],
        });
        return true;
    }

    return false;
}

module.exports = { run };