/**
 * ==========================================================
 *  TICKET ŞEMASI - Destek Talepleri
 * ----------------------------------------------------------
 *  Açık/kapalı ticket kanallarının tüm verilerini ve
 *  transkript durumunu saklar.
 * ==========================================================
 */

const { Schema, model } = require('mongoose');

const TicketSchema = new Schema(
    {
        guildId: { type: String, required: true, index: true },
        ticketNumber: { type: Number, required: true },
        channelId: { type: String, required: true, unique: true },
        category: { type: String, required: true },      // config key
        categoryLabel: { type: String, default: '' },
        creatorId: { type: String, required: true },
        status: {
            type: String,
            enum: ['open', 'closed', 'deleted'],
            default: 'open',
        },
        closedBy: { type: String, default: null },
        closedAt: { type: Date, default: null },
        closeReason: { type: String, default: null },
        transcriptMessageId: { type: String, default: null }, // arşiv kanalı mesajı
    },
    { timestamps: true }
);

module.exports = model('Ticket', TicketSchema);