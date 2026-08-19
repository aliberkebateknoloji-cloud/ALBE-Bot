/**
 * ==========================================================
 *  GUILD ŞEMASI - Sunucu Ayarları
 * ----------------------------------------------------------
 *  Hoş geldin, kayıt, guard, ticket ve lockdown ayarlarını
 *  sunucu bazında saklar.
 * ==========================================================
 */

const { Schema, model } = require('mongoose');

const GuildSchema = new Schema(
    {
        guildId: { type: String, required: true, unique: true, index: true },

        // --- Hoş Geldin / Görüşürüz ---
        welcomeChannelId: { type: String, default: null },
        welcomeEnabled: { type: Boolean, default: false },
        welcomeMessage: { type: String, default: null },
        leaveChannelId: { type: String, default: null },
        leaveEnabled: { type: Boolean, default: false },
        leaveMessage: { type: String, default: null },
        welcomeRoleId: { type: String, default: null }, // otomatik rol

        // --- Kayıt Sistemi ---
        kayitEnabled: { type: Boolean, default: false },
        kayitChannelId: { type: String, default: null },
        kayitMemberRoleId: { type: String, default: null },
        kayitUnregisteredRoleId: { type: String, default: null },

        // --- Guard / Anti-Raid ---
        antibotEnabled: { type: Boolean, default: false },
        maxJoinsPerMinute: { type: Number, default: 5 },

        // --- Lockdown anlık görüntüsü ---
        lockdown: [
            {
                channelId: { type: String, required: true },
                allow: { type: Number, default: 0 },
                deny: { type: Number, default: 0 },
            },
        ],

        // --- Ticket Sistemi ---
        ticketSupportRoleIds: { type: [String], default: [] },
        ticketCounter: { type: Number, default: 0 },
    },
    { timestamps: true }
);

module.exports = model('Guild', GuildSchema);