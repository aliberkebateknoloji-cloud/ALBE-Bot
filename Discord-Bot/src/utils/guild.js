/**
 * ==========================================================
 *  SUNUCU (GUID) AYAR YARDIMCISI
 * ----------------------------------------------------------
 *  Her sunucunun ayarları MongoDB'de tek bir dokümanda saklanır.
 *  Bu yardımcı, dokümanı getirir; yoksa oluşturur.
 * ==========================================================
 */

const Guild = require('../schemas/Guild');

/**
 * Sunucuya ait ayar dokümanını getirir (yoksa oluşturur).
 * @param {string} guildId
 * @returns {Promise<import('mongoose').Document>}
 */
async function getGuild(guildId) {
    let doc = await Guild.findOne({ guildId });
    if (!doc) {
        doc = await Guild.create({ guildId });
    }
    return doc;
}

/** MB bağlantısının açık olup olmadığını kontrol eder */
function hasDatabase(client) {
    return client.dbEnabled === true;
}

module.exports = { getGuild, hasDatabase };