/**
 * ==========================================================
 *  TICKET SERVİSİ
 * ----------------------------------------------------------
 *  Ticket kanallarının açılması, kapatılması ve yönetilmesi.
 *  Kategori bilgileri config.json'dan, destek rolleri ise
 *  sunucu ayarlarından (Guild şeması) gelir.
 * ==========================================================
 */

const {
    ChannelType,
    PermissionsBitField,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
} = require('discord.js');
const { readFile } = require('node:fs/promises');
const { AttachmentBuilder } = require('discord.js');
const Ticket = require('../schemas/Ticket');
const { getGuild } = require('../utils/guild');
const { generateTranscript } = require('./transcriptService');
const { formatDate } = require('../utils/time');
const { logger } = require('../utils/logger');

/**
 * Ticket açmak için izin verilen üye izinleri
 */
const MEMBER_ALLOW = [
    PermissionsBitField.Flags.ViewChannel,
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.ReadMessageHistory,
    PermissionsBitField.Flags.AttachFiles,
    PermissionsBitField.Flags.EmbedLinks,
];

/**
 * Destek ekibine verilen ekstra izinler
 */
const STAFF_ALLOW = [
    PermissionsBitField.Flags.ViewChannel,
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.ReadMessageHistory,
    PermissionsBitField.Flags.AttachFiles,
    PermissionsBitField.Flags.EmbedLinks,
    PermissionsBitField.Flags.ManageChannels,
    PermissionsBitField.Flags.ManageMessages,
];

/**
 * Yeni bir ticket kanalı açar.
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').GuildMember} member Ticket açan üye
 * @param {string} categoryKey config.ticket.categories içindeki key
 * @returns {Promise<{ ok: boolean, error?: string, channel?: import('discord.js').TextChannel }>}
 */
async function createTicket(client, guild, member, categoryKey) {
    const cfg = client.config.ticket;
    const category = cfg.categories.find((c) => c.key === categoryKey);
    if (!category) return { ok: false, error: 'Geçersiz ticket kategorisi.' };

    // Aynı anda açık ticket limiti kontrolü
    const openCount = await Ticket.countDocuments({
        guildId: guild.id,
        creatorId: member.id,
        status: 'open',
    });
    if (openCount >= cfg.maxPerUser) {
        return { ok: false, error: `Aynı anda en fazla **${cfg.maxPerUser}** açık ticket tutabilirsin.` };
    }

    // Sunucu ayarları + ticket numarası
    const guildDoc = await getGuild(guild.id);
    guildDoc.ticketCounter += 1;
    await guildDoc.save();
    const ticketNumber = guildDoc.ticketCounter;

    // Ticket kategorisini bul / oluştur
    let ticketCategory = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && c.name === cfg.categoryName
    );
    if (!ticketCategory) {
        ticketCategory = await guild.channels.create({
            name: cfg.categoryName,
            type: ChannelType.GuildCategory,
        });
    }

    // Destek rolü izinleri
    const supportRoles = (guildDoc.ticketSupportRoleIds || [])
        .map((id) => guild.roles.cache.get(id))
        .filter(Boolean);

    const channelName = `${cfg.prefix}-${ticketNumber}-${member.user.username}`.slice(0, 100);

    const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: ticketCategory.id,
        permissionOverwrites: [
            { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: member.id, allow: MEMBER_ALLOW },
            ...supportRoles.map((role) => ({ id: role.id, allow: STAFF_ALLOW })),
        ],
    });

    await Ticket.create({
        guildId: guild.id,
        ticketNumber,
        channelId: channel.id,
        category: categoryKey,
        categoryLabel: category.label,
        creatorId: member.id,
    });

    // Karşılama mesajı + aksiyon butonları
    const embed = new EmbedBuilder()
        .setColor(client.config.embeds.defaultColor)
        .setAuthor({ name: `${category.emoji} ${category.label}` })
        .setDescription(
            `Merhaba ${member}, destek ekibimiz en kısa sürede sana yardımcı olacaktır.\n` +
                `Lütfen talebini detaylı şekilde yaz ve ekibimizin yanıtını bekle.`
        )
        .addFields({ name: 'Ticket No', value: `#${ticketNumber}`, inline: true })
        .setFooter({ text: client.config.embeds.footerText })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_action:close').setLabel('Kapat').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
        new ButtonBuilder().setCustomId('ticket_action:claim').setLabel('Devral').setStyle(ButtonStyle.Primary).setEmoji('🫂'),
        new ButtonBuilder().setCustomId('ticket_action:add').setLabel('Üye Ekle').setStyle(ButtonStyle.Secondary).setEmoji('➕'),
        new ButtonBuilder().setCustomId('ticket_action:remove').setLabel('Üye Çıkar').setStyle(ButtonStyle.Secondary).setEmoji('➖')
    );

    await channel.send({ embeds: [embed], components: [row] });
    logger.success(`Ticket açıldı: #${ticketNumber} (${channel.name})`);

    return { ok: true, channel };
}

/**
 * Açık ticket kanalını bulur (açılan üyenin ve destek rolünün yanıt hakkı).
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').GuildMember} member
 * @returns {Promise<import('discord.js').TextChannel|null>}
 */
async function findOpenTicketFor(guild, member) {
    const ticket = await Ticket.findOne({
        guildId: guild.id,
        creatorId: member.id,
        status: 'open',
    }).sort({ createdAt: -1 });

    return ticket ? guild.channels.cache.get(ticket.channelId) || null : null;
}

/**
 * Ticket'ı kapatır: transkript üretir, arşive gönderir, kanalı kilitler.
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').TextChannel} channel
 * @param {import('discord.js').GuildMember} closer
 * @param {string} [reason]
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
async function closeTicket(client, guild, channel, closer, reason) {
    const cfg = client.config.ticket;
    const doc = await Ticket.findOne({ guildId: guild.id, channelId: channel.id });
    if (!doc) return { ok: false, error: 'Bu kanal, kayıtlı bir ticket ile eşleşmiyor.' };
    if (doc.status !== 'open') return { ok: false, error: 'Bu ticket zaten kapalı durumda.' };

    // Mesajları çek ve transkript üret
    const messages = [...(await channel.messages.fetch({ limit: 100 })).values()].reverse();
    const filePath = await generateTranscript(messages, {
        title: `Ticket #${doc.ticketNumber} - ${doc.categoryLabel}`,
        guildName: guild.name,
        channelName: channel.name,
    });
    const html = await readFile(filePath, 'utf-8');
    const file = new AttachmentBuilder(Buffer.from(html, 'utf-8'), {
        name: `ticket-${doc.ticketNumber}.html`,
    });

    // Arşiv kanalını bul / oluştur
    let archiveCategory = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && c.name === cfg.archiveCategoryName
    );
    if (!archiveCategory) {
        archiveCategory = await guild.channels.create({
            name: cfg.archiveCategoryName,
            type: ChannelType.GuildCategory,
        });
    }

    let archiveChannel = guild.channels.cache.find((c) => c.name === cfg.transcriptsChannelName);
    if (!archiveChannel) {
        archiveChannel = await guild.channels.create({
            name: cfg.transcriptsChannelName,
            type: ChannelType.GuildText,
            parent: archiveCategory.id,
        });
    }

    const creator = await guild.members.fetch(doc.creatorId).catch(() => null);
    const archiveMessage = await archiveChannel.send({
        content: `**🎫 Ticket #${doc.ticketNumber}** | ${creator ? `<@${creator.id}>` : `ID: ${doc.creatorId}`} | ${doc.categoryLabel}`,
        files: [file],
    });

    // Kanalı kilitle ve arşive taşı
    await channel.permissionOverwrites.edit(doc.creatorId, { SendMessages: false });
    await channel.setParent(archiveCategory.id, { lockPermissions: false });
    await channel.setName(`closed-${doc.ticketNumber}-${channel.name.replace(/^closed-\d+-/, '')}`.slice(0, 100));

    // Kapanış mesajı
    const embed = new EmbedBuilder()
        .setColor(client.config.embeds.successColor)
        .setTitle(`${client.config.emoji.ticket} Ticket Kapatıldı`)
        .setDescription(`Bu ticket ${closer} tarafından kapatıldı.`)
        .addFields(
            { name: 'Kapanış Tarihi', value: formatDate(new Date()), inline: true },
            { name: 'Sebep', value: reason || 'Sebep belirtilmedi.', inline: true }
        )
        .setFooter({ text: client.config.embeds.footerText })
        .setTimestamp();
    await channel.send({ embeds: [embed] });

    doc.status = 'closed';
    doc.closedBy = closer.id;
    doc.closedAt = new Date();
    doc.closeReason = reason || null;
    doc.transcriptMessageId = archiveMessage.id;
    await doc.save();

    // Kullanıcıya DM ile bilgilendirme dene (hata görmezden gel)
    if (creator && !creator.user.bot) {
        await creator
            .send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(client.config.embeds.infoColor)
                        .setTitle('Ticket Kapatıldı')
                        .setDescription(
                            `**#${doc.ticketNumber}** numaralı ticketın kapatıldı. Transkriptin ${archiveChannel} kanalında arşivlendi.`
                        )
                        .setFooter({ text: client.config.embeds.footerText }),
                ],
            })
            .catch(() => {});
    }

    logger.success(`Ticket kapatıldı: #${doc.ticketNumber}`);
    return { ok: true };
}

/**
 * Kapalı bir ticket'ı yeniden açar.
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').TextChannel} channel
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
async function reopenTicket(client, guild, channel) {
    const cfg = client.config.ticket;
    const doc = await Ticket.findOne({ guildId: guild.id, channelId: channel.id });
    if (!doc) return { ok: false, error: 'Bu kanal, kayıtlı bir ticket ile eşleşmiyor.' };
    if (doc.status !== 'closed') return { ok: false, error: 'Yalnızca kapalı ticketlar yeniden açılabilir.' };

    // Kategoriye geri taşı ve kilidi kaldır
    let ticketCategory = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && c.name === cfg.categoryName
    );
    if (!ticketCategory) {
        ticketCategory = await guild.channels.create({
            name: cfg.categoryName,
            type: ChannelType.GuildCategory,
        });
    }

    await channel.setParent(ticketCategory.id, { lockPermissions: false });
    await channel.permissionOverwrites.edit(doc.creatorId, { SendMessages: true });
    await channel.setName(channel.name.replace(/^closed-\d+-/, '').slice(0, 100));

    doc.status = 'open';
    doc.closedAt = null;
    doc.closedBy = null;
    await doc.save();

    await channel.send({ content: `🎫 Ticket yeniden açıldı.` });
    return { ok: true };
}

module.exports = { createTicket, closeTicket, reopenTicket, findOpenTicketFor };