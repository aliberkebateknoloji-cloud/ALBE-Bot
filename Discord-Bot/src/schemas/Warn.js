/**
 * ==========================================================
 *  WARN ŞEMASI - Uyarı Kayıtları
 * ----------------------------------------------------------
 *  Her uyarı TAM İZİN verilebilir şekilde saklanır:
 *  uyarılan üye, yetkili, sebep, case numarası ve tarihi.
 * ==========================================================
 */

const { Schema, model } = require('mongoose');

const WarnSchema = new Schema(
    {
        guildId: { type: String, required: true, index: true },
        userId: { type: String, required: true, index: true },
        moderatorId: { type: String, required: true },
        caseId: { type: Number, required: true },
        reason: { type: String, default: 'Sebep belirtilmedi.' },
    },
    { timestamps: true }
);

module.exports = model('Warn', WarnSchema);